import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { RecommendByTextDto } from './dto/recommend-by-text.dto';
import { RecommendVisualDto } from './dto/recommend-visual.dto';
import { IngestScryfallDto } from './dto/ingest-scryfall.dto';
import {
  ExistingStoredCardRow,
  PgVectorService,
  StoredCard,
} from './services/pg-vector.service';
import {
  ScryfallBulkCard,
  ScryfallBulkService,
} from './services/scryfall-bulk.service';
import { EmbeddingsService } from './services/embeddings.service';

export type IngestionStage =
  | 'queued'
  | 'fetching_cards'
  | 'embedding'
  | 'upserting'
  | 'cancelling'
  | 'cancelled'
  | 'completed'
  | 'failed';

export type IngestionStatus = 'running' | 'cancelled' | 'completed' | 'failed';

export interface IngestionJobStatus {
  jobId: string;
  status: IngestionStatus;
  stage: IngestionStage;
  requestedLimit?: number;
  batchSize: number;
  workerCount: number;
  fetched: number;
  processed: number;
  upserted: number;
  currentBatch: number;
  totalBatches: number;
  oracleEmbeddingsGenerated: number;
  flavorEmbeddingsGenerated: number;
  visualEmbeddingsGenerated: number;
  oracleEmbeddingsReused: number;
  flavorEmbeddingsReused: number;
  visualEmbeddingsReused: number;
  embeddingApiCalls: number;
  cardsFullyReused: number;
  cardsPartiallyRegenerated: number;
  progressPct: number;
  cardsPerSecond: number;
  estimatedRemainingMs?: number;
  cancelRequested: boolean;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

class IngestionCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IngestionCancelledError';
  }
}

@Injectable()
export class RecommenderService {
  private readonly logger = new Logger(RecommenderService.name);
  private readonly verboseBatchLogs = process.env.LOG_INGEST_BATCHES === 'true';
  private readonly progressLogStepPct = Math.max(
    1,
    Number(process.env.INGEST_LOG_PROGRESS_STEP ?? 5),
  );
  private readonly ingestionJobs = new Map<string, IngestionJobStatus>();
  private readonly lastProgressMilestoneByJob = new Map<string, number>();
  private latestIngestionJobId: string | null = null;
  private activeIngestionJobId: string | null = null;

  constructor(
    private readonly pgVectorService: PgVectorService,
    private readonly scryfallBulkService: ScryfallBulkService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async recommendByOracle(dto: RecommendByTextDto) {
    const queryEmbedding = await this.embeddingsService.embedOne(dto.query);
    const cards = await this.pgVectorService.findNearestByEmbedding({
      embedding: queryEmbedding,
      field: 'oracle_embedding',
      limit: dto.limit,
      excludeCardId: dto.excludeCardId,
    });

    return {
      mode: 'oracle',
      query: dto.query,
      data: cards,
    };
  }

  async recommendByFlavor(dto: RecommendByTextDto) {
    const queryEmbedding = await this.embeddingsService.embedOne(dto.query);
    const cards = await this.pgVectorService.findNearestByEmbedding({
      embedding: queryEmbedding,
      field: 'flavor_embedding',
      limit: dto.limit,
      excludeCardId: dto.excludeCardId,
    });

    return {
      mode: 'flavor',
      query: dto.query,
      data: cards,
    };
  }

  async recommendVisuallySimilar(dto: RecommendVisualDto) {
    const source = await this.pgVectorService.getCardById(dto.cardId);
    if (!source || !source.visual_embedding) {
      throw new NotFoundException(
        `Card '${dto.cardId}' not found or missing visual embedding`,
      );
    }

    const cards = await this.pgVectorService.findNearestByVectorLiteral({
      vectorLiteral: source.visual_embedding,
      field: 'visual_embedding',
      limit: dto.limit,
      excludeCardId: dto.cardId,
    });

    return {
      mode: 'visual',
      cardId: dto.cardId,
      data: cards,
    };
  }

  async ingestScryfallBulk(dto: IngestScryfallDto) {
    this.logger.log(
      `Starting synchronous Scryfall ingest (limit=${dto.limit ?? 'all'}, batchSize=${dto.batchSize})`,
    );

    const startedAt = Date.now();
    const cards = await this.scryfallBulkService.fetchDefaultCards(dto.limit);
    const batchSize = dto.batchSize;
    let lastLoggedMilestone = 0;

    let upserted = 0;
    let oracleEmbeddingsGenerated = 0;
    let flavorEmbeddingsGenerated = 0;
    let visualEmbeddingsGenerated = 0;
    let oracleEmbeddingsReused = 0;
    let flavorEmbeddingsReused = 0;
    let visualEmbeddingsReused = 0;
    let embeddingApiCalls = 0;
    let cardsFullyReused = 0;
    let cardsPartiallyRegenerated = 0;
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(cards.length / batchSize);

      const { rows, embeddingWork } = await this.prepareStoredCards(batch);

      oracleEmbeddingsGenerated += embeddingWork.oracleGenerated;
      flavorEmbeddingsGenerated += embeddingWork.flavorGenerated;
      visualEmbeddingsGenerated += embeddingWork.visualGenerated;
      oracleEmbeddingsReused += embeddingWork.oracleReused;
      flavorEmbeddingsReused += embeddingWork.flavorReused;
      visualEmbeddingsReused += embeddingWork.visualReused;
      embeddingApiCalls += embeddingWork.apiCalls;
      cardsFullyReused += embeddingWork.cardsFullyReused;
      cardsPartiallyRegenerated += embeddingWork.cardsPartiallyRegenerated;

      upserted += await this.pgVectorService.upsertCards(rows);

      const processed = Math.min(i + batch.length, cards.length);
      const progressPct =
        cards.length > 0 ? (processed / cards.length) * 100 : 0;
      const milestone =
        Math.floor(progressPct / this.progressLogStepPct) *
        this.progressLogStepPct;

      if (this.verboseBatchLogs) {
        this.logger.debug(
          `Sync ingest batch ${batchIndex}/${totalBatches}: processed=${processed}/${cards.length}, upserted=${upserted}, apiCalls=${embeddingWork.apiCalls}, cardsFullyReused=${embeddingWork.cardsFullyReused}, cardsPartiallyRegenerated=${embeddingWork.cardsPartiallyRegenerated}, embedsGenerated(oracle=${embeddingWork.oracleGenerated}, flavor=${embeddingWork.flavorGenerated}, visual=${embeddingWork.visualGenerated}), embedsReused(oracle=${embeddingWork.oracleReused}, flavor=${embeddingWork.flavorReused}, visual=${embeddingWork.visualReused})`,
        );
      } else if (
        milestone > lastLoggedMilestone ||
        processed === cards.length
      ) {
        lastLoggedMilestone = milestone;
        this.logger.log(
          `Sync ingest progress: processed=${processed}/${cards.length}, upserted=${upserted}, progress=${progressPct.toFixed(2)}%`,
        );
      }
    }

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `Synchronous Scryfall ingest completed: fetched=${cards.length}, upserted=${upserted}, durationMs=${durationMs}, apiCalls=${embeddingApiCalls}, cardsFullyReused=${cardsFullyReused}, cardsPartiallyRegenerated=${cardsPartiallyRegenerated}, embedsGenerated(oracle=${oracleEmbeddingsGenerated}, flavor=${flavorEmbeddingsGenerated}, visual=${visualEmbeddingsGenerated}), embedsReused(oracle=${oracleEmbeddingsReused}, flavor=${flavorEmbeddingsReused}, visual=${visualEmbeddingsReused})`,
    );

    return {
      fetched: cards.length,
      upserted,
      batchSize,
      durationMs,
      embeddingStats: {
        generated: {
          oracle: oracleEmbeddingsGenerated,
          flavor: flavorEmbeddingsGenerated,
          visual: visualEmbeddingsGenerated,
        },
        reused: {
          oracle: oracleEmbeddingsReused,
          flavor: flavorEmbeddingsReused,
          visual: visualEmbeddingsReused,
        },
        apiCalls: embeddingApiCalls,
        cardsFullyReused,
        cardsPartiallyRegenerated,
      },
    };
  }

  startScryfallIngestion(dto: IngestScryfallDto) {
    if (this.activeIngestionJobId) {
      const active = this.ingestionJobs.get(this.activeIngestionJobId);
      this.logger.warn(
        `Rejected async ingest start: active job already running (${this.activeIngestionJobId})`,
      );
      throw new ConflictException({
        message: 'An ingestion job is already running',
        activeJobId: this.activeIngestionJobId,
        active,
      });
    }

    const jobId = this.createJobId();
    const now = new Date().toISOString();

    const job: IngestionJobStatus = {
      jobId,
      status: 'running',
      stage: 'queued',
      requestedLimit: dto.limit,
      batchSize: dto.batchSize,
      workerCount: dto.workerCount,
      fetched: 0,
      processed: 0,
      upserted: 0,
      currentBatch: 0,
      totalBatches: 0,
      oracleEmbeddingsGenerated: 0,
      flavorEmbeddingsGenerated: 0,
      visualEmbeddingsGenerated: 0,
      oracleEmbeddingsReused: 0,
      flavorEmbeddingsReused: 0,
      visualEmbeddingsReused: 0,
      embeddingApiCalls: 0,
      cardsFullyReused: 0,
      cardsPartiallyRegenerated: 0,
      progressPct: 0,
      cardsPerSecond: 0,
      cancelRequested: false,
      startedAt: now,
      updatedAt: now,
    };

    this.ingestionJobs.set(jobId, job);
    this.latestIngestionJobId = jobId;
    this.activeIngestionJobId = jobId;
    this.lastProgressMilestoneByJob.set(jobId, 0);

    this.logger.log(
      `Async Scryfall ingest started: jobId=${jobId}, limit=${dto.limit ?? 'all'}, batchSize=${dto.batchSize}, workerCount=${dto.workerCount}`,
    );

    void this.runIngestionJob(jobId, dto);

    return {
      message: 'Ingestion started',
      jobId,
      statusUrl: `/api/recommender/ingest/scryfall/status/${jobId}`,
      status: job,
    };
  }

  getScryfallIngestionStatus(jobId: string) {
    const status = this.ingestionJobs.get(jobId);
    if (!status) {
      throw new NotFoundException(`Ingestion job '${jobId}' not found`);
    }
    return status;
  }

  getLatestScryfallIngestionStatus() {
    if (!this.latestIngestionJobId) {
      throw new NotFoundException('No ingestion jobs have been started');
    }
    return this.getScryfallIngestionStatus(this.latestIngestionJobId);
  }

  cancelScryfallIngestion(jobId: string) {
    const status = this.ingestionJobs.get(jobId);
    if (!status) {
      throw new NotFoundException(`Ingestion job '${jobId}' not found`);
    }

    if (status.status !== 'running') {
      this.logger.warn(
        `Cancellation ignored: job ${jobId} is already ${status.status}`,
      );
      return {
        message: `Job '${jobId}' is already ${status.status}`,
        status,
      };
    }

    const updated = this.updateJob(jobId, {
      cancelRequested: true,
      stage: 'cancelling',
    });

    this.logger.warn(`Cancellation requested for ingestion job ${jobId}`);

    return {
      message: `Cancellation requested for job '${jobId}'`,
      status: updated,
    };
  }

  private async runIngestionJob(
    jobId: string,
    dto: IngestScryfallDto,
  ): Promise<void> {
    const startTs = Date.now();
    try {
      this.updateJob(jobId, { stage: 'fetching_cards' });
      this.logger.log(`Job ${jobId}: fetching Scryfall bulk cards`);

      const cards = await this.scryfallBulkService.fetchDefaultCards(dto.limit);
      const batchSize = dto.batchSize;
      const workerCount = dto.workerCount;
      const totalBatches = Math.ceil(cards.length / batchSize);

      this.updateJob(jobId, {
        fetched: cards.length,
        totalBatches,
      });

      this.logger.log(
        `Job ${jobId}: fetched ${cards.length} cards, totalBatches=${totalBatches}, workerCount=${workerCount}`,
      );

      let upserted = 0;
      let processed = 0;
      let oracleEmbeddingsGenerated = 0;
      let flavorEmbeddingsGenerated = 0;
      let visualEmbeddingsGenerated = 0;
      let oracleEmbeddingsReused = 0;
      let flavorEmbeddingsReused = 0;
      let visualEmbeddingsReused = 0;
      let embeddingApiCalls = 0;
      let cardsFullyReused = 0;
      let cardsPartiallyRegenerated = 0;

      const batches: ScryfallBulkCard[][] = [];
      for (let i = 0; i < cards.length; i += batchSize) {
        batches.push(cards.slice(i, i + batchSize));
      }

      let nextBatchIndex = 0;

      const runWorker = async (): Promise<void> => {
        while (true) {
          this.throwIfCancelled(jobId);

          const batchIndex = nextBatchIndex;
          nextBatchIndex += 1;
          if (batchIndex >= batches.length) {
            return;
          }

          const batch = batches[batchIndex];
          const oneBasedBatchIndex = batchIndex + 1;

          this.updateJob(jobId, {
            stage: 'embedding',
            currentBatch: oneBasedBatchIndex,
          });

          const { rows, embeddingWork } = await this.prepareStoredCards(batch);

          oracleEmbeddingsGenerated += embeddingWork.oracleGenerated;
          flavorEmbeddingsGenerated += embeddingWork.flavorGenerated;
          visualEmbeddingsGenerated += embeddingWork.visualGenerated;
          oracleEmbeddingsReused += embeddingWork.oracleReused;
          flavorEmbeddingsReused += embeddingWork.flavorReused;
          visualEmbeddingsReused += embeddingWork.visualReused;
          embeddingApiCalls += embeddingWork.apiCalls;
          cardsFullyReused += embeddingWork.cardsFullyReused;
          cardsPartiallyRegenerated += embeddingWork.cardsPartiallyRegenerated;

          this.throwIfCancelled(jobId);

          this.updateJob(jobId, { stage: 'upserting' });

          if (this.verboseBatchLogs) {
            this.logger.debug(
              `Job ${jobId} batch ${oneBasedBatchIndex}/${totalBatches}: apiCalls=${embeddingWork.apiCalls}, cardsFullyReused=${embeddingWork.cardsFullyReused}, cardsPartiallyRegenerated=${embeddingWork.cardsPartiallyRegenerated}, embedsGenerated(oracle=${embeddingWork.oracleGenerated}, flavor=${embeddingWork.flavorGenerated}, visual=${embeddingWork.visualGenerated}), embedsReused(oracle=${embeddingWork.oracleReused}, flavor=${embeddingWork.flavorReused}, visual=${embeddingWork.visualReused})`,
            );
          }

          const inserted = await this.pgVectorService.upsertCards(rows);
          upserted += inserted;
          processed += batch.length;

          this.updateJob(jobId, {
            processed,
            upserted,
            currentBatch: oneBasedBatchIndex,
            oracleEmbeddingsGenerated,
            flavorEmbeddingsGenerated,
            visualEmbeddingsGenerated,
            oracleEmbeddingsReused,
            flavorEmbeddingsReused,
            visualEmbeddingsReused,
            embeddingApiCalls,
            cardsFullyReused,
            cardsPartiallyRegenerated,
          });
        }
      };

      const safeWorkerCount = Math.max(
        1,
        Math.min(workerCount, totalBatches || 1),
      );

      this.logger.log(
        `Job ${jobId}: starting ${safeWorkerCount} worker(s) for ingestion`,
      );

      await Promise.all(
        Array.from({ length: safeWorkerCount }, () => runWorker()),
      );

      const completedAt = new Date().toISOString();
      this.updateJob(jobId, {
        status: 'completed',
        stage: 'completed',
        completedAt,
        durationMs: Date.now() - startTs,
      });

      const completed = this.ingestionJobs.get(jobId);
      this.logger.log(
        `Job ${jobId} completed: processed=${completed?.processed ?? 0}, upserted=${completed?.upserted ?? 0}, durationMs=${completed?.durationMs ?? 0}, apiCalls=${completed?.embeddingApiCalls ?? 0}, cardsFullyReused=${completed?.cardsFullyReused ?? 0}, cardsPartiallyRegenerated=${completed?.cardsPartiallyRegenerated ?? 0}, embedsGenerated(oracle=${completed?.oracleEmbeddingsGenerated ?? 0}, flavor=${completed?.flavorEmbeddingsGenerated ?? 0}, visual=${completed?.visualEmbeddingsGenerated ?? 0}), embedsReused(oracle=${completed?.oracleEmbeddingsReused ?? 0}, flavor=${completed?.flavorEmbeddingsReused ?? 0}, visual=${completed?.visualEmbeddingsReused ?? 0})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const completedAt = new Date().toISOString();

      if (error instanceof IngestionCancelledError) {
        this.updateJob(jobId, {
          status: 'cancelled',
          stage: 'cancelled',
          error: message,
          completedAt,
          durationMs: Date.now() - startTs,
        });

        this.logger.warn(`Job ${jobId} cancelled by request`);
        return;
      }

      this.updateJob(jobId, {
        status: 'failed',
        stage: 'failed',
        error: message,
        completedAt,
        durationMs: Date.now() - startTs,
      });

      this.logger.error(`Job ${jobId} failed: ${message}`);
    } finally {
      if (this.activeIngestionJobId === jobId) {
        this.activeIngestionJobId = null;
      }
      this.lastProgressMilestoneByJob.delete(jobId);
    }
  }

  private updateJob(
    jobId: string,
    patch: Partial<IngestionJobStatus>,
  ): IngestionJobStatus {
    const current = this.ingestionJobs.get(jobId);
    if (!current) {
      throw new NotFoundException(`Ingestion job '${jobId}' not found`);
    }

    const merged: IngestionJobStatus = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    const next = this.enrichMetrics(merged);

    if (patch.processed !== undefined || patch.upserted !== undefined) {
      this.logJobProgress(next);
    }

    this.ingestionJobs.set(jobId, next);
    return next;
  }

  private enrichMetrics(job: IngestionJobStatus): IngestionJobStatus {
    const startedAtMs = Date.parse(job.startedAt);
    const nowMs = job.completedAt ? Date.parse(job.completedAt) : Date.now();
    const elapsedMs = Math.max(0, nowMs - startedAtMs);

    const cardsPerSecond =
      elapsedMs > 0 ? (job.processed / elapsedMs) * 1000 : 0;
    const progressPct =
      job.fetched > 0
        ? Number(((job.processed / job.fetched) * 100).toFixed(2))
        : 0;

    let estimatedRemainingMs: number | undefined;
    if (
      job.status === 'running' &&
      cardsPerSecond > 0 &&
      job.fetched > job.processed
    ) {
      estimatedRemainingMs = Math.round(
        ((job.fetched - job.processed) / cardsPerSecond) * 1000,
      );
    }

    return {
      ...job,
      cardsPerSecond: Number(cardsPerSecond.toFixed(2)),
      progressPct,
      estimatedRemainingMs,
    };
  }

  private throwIfCancelled(jobId: string): void {
    const status = this.ingestionJobs.get(jobId);
    if (status?.cancelRequested) {
      throw new IngestionCancelledError('Ingestion cancelled by user');
    }
  }

  private createJobId(): string {
    const random = Math.random().toString(36).slice(2, 8);
    return `ing-${Date.now()}-${random}`;
  }

  private logJobProgress(job: IngestionJobStatus): void {
    if (this.verboseBatchLogs) {
      this.logger.debug(
        `Job ${job.jobId} progress: batch=${job.currentBatch}/${job.totalBatches}, stage=${job.stage}, processed=${job.processed}/${job.fetched}, upserted=${job.upserted}, apiCalls=${job.embeddingApiCalls}, cardsFullyReused=${job.cardsFullyReused}, cardsPartiallyRegenerated=${job.cardsPartiallyRegenerated}, generated(oracle=${job.oracleEmbeddingsGenerated}, flavor=${job.flavorEmbeddingsGenerated}, visual=${job.visualEmbeddingsGenerated}), reused(oracle=${job.oracleEmbeddingsReused}, flavor=${job.flavorEmbeddingsReused}, visual=${job.visualEmbeddingsReused}), progress=${job.progressPct}%, rate=${job.cardsPerSecond} cards/s${job.estimatedRemainingMs !== undefined ? `, etaMs=${job.estimatedRemainingMs}` : ''}`,
      );
      return;
    }

    const milestone =
      Math.floor(job.progressPct / this.progressLogStepPct) *
      this.progressLogStepPct;
    const previousMilestone =
      this.lastProgressMilestoneByJob.get(job.jobId) ?? 0;

    if (milestone <= previousMilestone && job.processed < job.fetched) {
      return;
    }

    this.lastProgressMilestoneByJob.set(job.jobId, milestone);
    this.logger.log(
      `Job ${job.jobId} progress: processed=${job.processed}/${job.fetched}, upserted=${job.upserted}, apiCalls=${job.embeddingApiCalls}, cardsFullyReused=${job.cardsFullyReused}, cardsPartiallyRegenerated=${job.cardsPartiallyRegenerated}, generated(oracle=${job.oracleEmbeddingsGenerated}, flavor=${job.flavorEmbeddingsGenerated}, visual=${job.visualEmbeddingsGenerated}), reused(oracle=${job.oracleEmbeddingsReused}, flavor=${job.flavorEmbeddingsReused}, visual=${job.visualEmbeddingsReused}), progress=${job.progressPct}%, rate=${job.cardsPerSecond} cards/s${job.estimatedRemainingMs !== undefined ? `, etaMs=${job.estimatedRemainingMs}` : ''}`,
    );
  }

  private buildOracleText(card: ScryfallBulkCard): string {
    const text = card.oracle_text?.trim();
    if (text) {
      return `${card.name}. ${text}`;
    }
    return '';
  }

  private buildFlavorText(card: ScryfallBulkCard): string {
    const text = card.flavor_text?.trim();
    if (text) {
      return `${card.name}. ${text}`;
    }
    return '';
  }

  private buildVisualText(card: ScryfallBulkCard): string {
    const parts = [
      card.name,
      card.type_line ?? '',
      card.artist ?? '',
      card.set_name ?? '',
      card.rarity ?? '',
      card.color_identity?.join(' ') ?? '',
      card.mana_cost ?? '',
      card.oracle_text ?? '',
    ];

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  private async prepareStoredCards(batch: ScryfallBulkCard[]): Promise<{
    rows: StoredCard[];
    embeddingWork: {
      oracleGenerated: number;
      flavorGenerated: number;
      visualGenerated: number;
      oracleReused: number;
      flavorReused: number;
      visualReused: number;
      apiCalls: number;
      cardsFullyReused: number;
      cardsPartiallyRegenerated: number;
    };
  }> {
    const existingById = await this.pgVectorService.getExistingCardsByIds(
      batch.map((card) => card.id),
    );

    const oracleSources = batch.map((card) => this.buildOracleText(card));
    const flavorSources = batch.map((card) => this.buildFlavorText(card));
    const visualSources = batch.map((card) => this.buildVisualText(card));

    const oracleHashes = oracleSources.map((text) => this.hashSource(text));
    const flavorHashes = flavorSources.map((text) => this.hashSource(text));
    const visualHashes = visualSources.map((text) => this.hashSource(text));

    const oracleInputs = batch.map((card, index) =>
      this.shouldReembed(
        oracleHashes[index],
        existingById.get(card.id)?.oracle_source_hash ?? null,
      )
        ? oracleSources[index]
        : '',
    );
    const flavorInputs = batch.map((card, index) =>
      this.shouldReembed(
        flavorHashes[index],
        existingById.get(card.id)?.flavor_source_hash ?? null,
      )
        ? flavorSources[index]
        : '',
    );
    const visualInputs = batch.map((card, index) =>
      this.shouldReembed(
        visualHashes[index],
        existingById.get(card.id)?.visual_source_hash ?? null,
      )
        ? visualSources[index]
        : '',
    );

    const oracleEmbeddings =
      await this.embeddingsService.embedManyOptional(oracleInputs);
    const flavorEmbeddings =
      await this.embeddingsService.embedManyOptional(flavorInputs);
    const visualEmbeddings =
      await this.embeddingsService.embedManyOptional(visualInputs);

    const perCardRegeneratedCount = batch.map((_, index) => {
      let regenerated = 0;
      if (oracleInputs[index]) regenerated += 1;
      if (flavorInputs[index]) regenerated += 1;
      if (visualInputs[index]) regenerated += 1;
      return regenerated;
    });

    const rows: StoredCard[] = batch.map((card, index) => ({
      card_id: card.id,
      name: card.name,
      oracle_text: card.oracle_text ?? null,
      flavor_text: card.flavor_text ?? null,
      oracle_source_hash: oracleHashes[index],
      flavor_source_hash: flavorHashes[index],
      visual_source_hash: visualHashes[index],
      image_uri:
        card.image_uris?.normal ??
        card.card_faces?.find((face) => face.image_uris?.normal)?.image_uris
          ?.normal ??
        null,
      scryfall_uri: card.scryfall_uri,
      set_code: card.set,
      collector_number: card.collector_number ?? null,
      oracle_embedding: oracleEmbeddings[index],
      flavor_embedding: flavorEmbeddings[index],
      visual_embedding: visualEmbeddings[index],
    }));

    return {
      rows,
      embeddingWork: {
        oracleGenerated: oracleInputs.filter(Boolean).length,
        flavorGenerated: flavorInputs.filter(Boolean).length,
        visualGenerated: visualInputs.filter(Boolean).length,
        oracleReused: oracleInputs.filter((value) => !value).length,
        flavorReused: flavorInputs.filter((value) => !value).length,
        visualReused: visualInputs.filter((value) => !value).length,
        apiCalls: [oracleInputs, flavorInputs, visualInputs].filter((inputs) =>
          inputs.some(Boolean),
        ).length,
        cardsFullyReused: perCardRegeneratedCount.filter((count) => count === 0)
          .length,
        cardsPartiallyRegenerated: perCardRegeneratedCount.filter(
          (count) => count > 0 && count < 3,
        ).length,
      },
    };
  }

  private hashSource(text: string): string | null {
    const normalized = text.trim();
    if (normalized.length === 0) {
      return null;
    }

    return createHash('sha256').update(normalized).digest('hex');
  }

  private shouldReembed(
    nextHash: string | null,
    existingHash: ExistingStoredCardRow['oracle_source_hash'],
  ): boolean {
    return nextHash !== null && nextHash !== existingHash;
  }
}
