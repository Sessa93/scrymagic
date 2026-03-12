import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool } from 'pg';

type EmbeddingField =
  | 'oracle_embedding'
  | 'flavor_embedding'
  | 'visual_embedding';

export interface StoredCard {
  card_id: string;
  name: string;
  oracle_text: string | null;
  flavor_text: string | null;
  oracle_source_hash: string | null;
  flavor_source_hash: string | null;
  visual_source_hash: string | null;
  image_uri: string | null;
  scryfall_uri: string;
  set_code: string;
  collector_number: string | null;
  oracle_embedding: number[] | null;
  flavor_embedding: number[] | null;
  visual_embedding: number[] | null;
}

interface FindByEmbeddingInput {
  embedding: number[];
  field: EmbeddingField;
  limit: number;
  excludeCardId?: string;
}

interface FindByVectorLiteralInput {
  vectorLiteral: string;
  field: EmbeddingField;
  limit: number;
  excludeCardId?: string;
}

interface CardVisualEmbeddingRow {
  card_id: string;
  visual_embedding: string | null;
}

export interface ExistingStoredCardRow {
  card_id: string;
  oracle_source_hash: string | null;
  flavor_source_hash: string | null;
  visual_source_hash: string | null;
  oracle_embedding: string | null;
  flavor_embedding: string | null;
  visual_embedding: string | null;
}

export interface RecommendedCardRow {
  card_id: string;
  name: string;
  oracle_text: string | null;
  flavor_text: string | null;
  image_uri: string | null;
  scryfall_uri: string;
  set_code: string;
  collector_number: string | null;
  distance: number;
  score: number;
}

@Injectable()
export class PgVectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgVectorService.name);
  private readonly embeddingDimension = Number(
    process.env.EMBEDDING_DIMENSION ?? 1536,
  );

  private readonly pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        host: process.env.PGHOST ?? '127.0.0.1',
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE ?? 'scrymagic',
        user: process.env.PGUSER ?? 'postgres',
        password: process.env.PGPASSWORD ?? 'postgres',
      });

  async onModuleInit(): Promise<void> {
    if (
      !Number.isInteger(this.embeddingDimension) ||
      this.embeddingDimension < 1
    ) {
      throw new Error('EMBEDDING_DIMENSION must be a positive integer');
    }

    await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS card_embeddings (
        card_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        oracle_text TEXT,
        flavor_text TEXT,
        oracle_source_hash TEXT,
        flavor_source_hash TEXT,
        visual_source_hash TEXT,
        image_uri TEXT,
        scryfall_uri TEXT NOT NULL,
        set_code TEXT NOT NULL,
        collector_number TEXT,
        oracle_embedding VECTOR(${this.embeddingDimension}),
        flavor_embedding VECTOR(${this.embeddingDimension}),
        visual_embedding VECTOR(${this.embeddingDimension}),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.pool.query(
      'ALTER TABLE card_embeddings ADD COLUMN IF NOT EXISTS oracle_source_hash TEXT',
    );
    await this.pool.query(
      'ALTER TABLE card_embeddings ADD COLUMN IF NOT EXISTS flavor_source_hash TEXT',
    );
    await this.pool.query(
      'ALTER TABLE card_embeddings ADD COLUMN IF NOT EXISTS visual_source_hash TEXT',
    );

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS card_embeddings_oracle_embedding_idx
      ON card_embeddings USING ivfflat (oracle_embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS card_embeddings_flavor_embedding_idx
      ON card_embeddings USING ivfflat (flavor_embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS card_embeddings_visual_embedding_idx
      ON card_embeddings USING ivfflat (visual_embedding vector_cosine_ops)
      WITH (lists = 100)
    `);

    this.logger.log('pgvector schema initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async getCardById(cardId: string): Promise<CardVisualEmbeddingRow | null> {
    const { rows } = await this.pool.query<CardVisualEmbeddingRow>(
      `
        SELECT
          card_id,
          visual_embedding
        FROM card_embeddings
        WHERE card_id = $1
      `,
      [cardId],
    );

    return rows[0] ?? null;
  }

  async upsertCards(cards: StoredCard[]): Promise<number> {
    if (cards.length === 0) {
      return 0;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const card of cards) {
        await client.query(
          `
            INSERT INTO card_embeddings (
              card_id,
              name,
              oracle_text,
              flavor_text,
              oracle_source_hash,
              flavor_source_hash,
              visual_source_hash,
              image_uri,
              scryfall_uri,
              set_code,
              collector_number,
              oracle_embedding,
              flavor_embedding,
              visual_embedding,
              updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8, $9, $10, $11,
              $12::vector, $13::vector, $14::vector,
              NOW()
            )
            ON CONFLICT (card_id) DO UPDATE SET
              name = EXCLUDED.name,
              oracle_text = EXCLUDED.oracle_text,
              flavor_text = EXCLUDED.flavor_text,
              oracle_source_hash = EXCLUDED.oracle_source_hash,
              flavor_source_hash = EXCLUDED.flavor_source_hash,
              visual_source_hash = EXCLUDED.visual_source_hash,
              image_uri = EXCLUDED.image_uri,
              scryfall_uri = EXCLUDED.scryfall_uri,
              set_code = EXCLUDED.set_code,
              collector_number = EXCLUDED.collector_number,
              oracle_embedding = COALESCE(EXCLUDED.oracle_embedding, card_embeddings.oracle_embedding),
              flavor_embedding = COALESCE(EXCLUDED.flavor_embedding, card_embeddings.flavor_embedding),
              visual_embedding = COALESCE(EXCLUDED.visual_embedding, card_embeddings.visual_embedding),
              updated_at = NOW()
          `,
          [
            card.card_id,
            card.name,
            card.oracle_text,
            card.flavor_text,
            card.oracle_source_hash,
            card.flavor_source_hash,
            card.visual_source_hash,
            card.image_uri,
            card.scryfall_uri,
            card.set_code,
            card.collector_number,
            this.toVectorLiteral(card.oracle_embedding),
            this.toVectorLiteral(card.flavor_embedding),
            this.toVectorLiteral(card.visual_embedding),
          ],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return cards.length;
  }

  async getExistingCardsByIds(
    cardIds: string[],
  ): Promise<Map<string, ExistingStoredCardRow>> {
    if (cardIds.length === 0) {
      return new Map();
    }

    const { rows } = await this.pool.query<ExistingStoredCardRow>(
      `
        SELECT
          card_id,
          oracle_source_hash,
          flavor_source_hash,
          visual_source_hash,
          oracle_embedding,
          flavor_embedding,
          visual_embedding
        FROM card_embeddings
        WHERE card_id = ANY($1::text[])
      `,
      [cardIds],
    );

    return new Map(rows.map((row) => [row.card_id, row]));
  }

  async findNearestByEmbedding(
    input: FindByEmbeddingInput,
  ): Promise<RecommendedCardRow[]> {
    return this.findNearestByVectorLiteral({
      vectorLiteral: this.toVectorLiteral(input.embedding)!,
      field: input.field,
      limit: input.limit,
      excludeCardId: input.excludeCardId,
    });
  }

  async findNearestByVectorLiteral(
    input: FindByVectorLiteralInput,
  ): Promise<RecommendedCardRow[]> {
    const params: Array<string | number> = [input.vectorLiteral, input.limit];

    let where = `${input.field} IS NOT NULL`;
    if (input.excludeCardId) {
      params.push(input.excludeCardId);
      where += ` AND card_id <> $${params.length}`;
    }

    const { rows } = await this.pool.query<RecommendedCardRow>(
      `
        SELECT
          card_id,
          name,
          oracle_text,
          flavor_text,
          image_uri,
          scryfall_uri,
          set_code,
          collector_number,
          (${input.field} <=> $1::vector) AS distance,
          (1 - (${input.field} <=> $1::vector)) AS score
        FROM card_embeddings
        WHERE ${where}
        ORDER BY ${input.field} <=> $1::vector ASC
        LIMIT $2
      `,
      params,
    );

    return rows;
  }

  private toVectorLiteral(embedding: number[] | null): string | null {
    if (!embedding || embedding.length === 0) {
      return null;
    }
    return `[${embedding.join(',')}]`;
  }
}
