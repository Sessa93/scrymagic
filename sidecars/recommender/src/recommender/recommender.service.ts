import { Injectable, NotFoundException } from '@nestjs/common';
import { RecommendByTextDto } from './dto/recommend-by-text.dto';
import { RecommendVisualDto } from './dto/recommend-visual.dto';
import { IngestScryfallDto } from './dto/ingest-scryfall.dto';
import { PgVectorService, StoredCard } from './services/pg-vector.service';
import {
  ScryfallBulkCard,
  ScryfallBulkService,
} from './services/scryfall-bulk.service';
import { EmbeddingsService } from './services/embeddings.service';

@Injectable()
export class RecommenderService {
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
    const cards = await this.scryfallBulkService.fetchDefaultCards(dto.limit);
    const batchSize = dto.batchSize;

    let upserted = 0;
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);

      const oracleInputs = batch.map((card) => this.buildOracleText(card));
      const flavorInputs = batch.map((card) => this.buildFlavorText(card));
      const visualInputs = batch.map((card) => this.buildVisualText(card));

      const oracleEmbeddings =
        await this.embeddingsService.embedManyOptional(oracleInputs);
      const flavorEmbeddings =
        await this.embeddingsService.embedManyOptional(flavorInputs);
      const visualEmbeddings =
        await this.embeddingsService.embedManyOptional(visualInputs);

      const rows: StoredCard[] = batch.map((card, index) => ({
        card_id: card.id,
        name: card.name,
        oracle_text: card.oracle_text ?? null,
        flavor_text: card.flavor_text ?? null,
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

      upserted += await this.pgVectorService.upsertCards(rows);
    }

    return {
      fetched: cards.length,
      upserted,
      batchSize,
    };
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
}
