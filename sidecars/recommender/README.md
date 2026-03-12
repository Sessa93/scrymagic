# Recommender Sidecar (NestJS)

This service provides card recommendations for the main app using:

- Scryfall bulk data as the source corpus
- OpenAI embeddings for vectorization
- PostgreSQL + pgvector for nearest-neighbor search

## APIs

Base prefix: `/api/recommender`

### 1) Recommend by oracle text

`POST /api/recommender/recommend/oracle`

```json
{
  "query": "destroy target creature",
  "limit": 12,
  "excludeCardId": "optional-scryfall-card-id"
}
```

### 2) Recommend by flavor text

`POST /api/recommender/recommend/flavor`

```json
{
  "query": "a lonely knight under a blood moon",
  "limit": 12,
  "excludeCardId": "optional-scryfall-card-id"
}
```

### 3) Recommend visually similar cards

`POST /api/recommender/recommend/visual`

```json
{
  "cardId": "scryfall-card-id",
  "limit": 12
}
```

### 4) Ingest embeddings from Scryfall bulk data

`POST /api/recommender/ingest/scryfall`

```json
{
  "limit": 1000,
  "batchSize": 32
}
```

`limit` is optional and useful for controlled initial indexing.

## Required environment variables

```bash
OPENAI_API_KEY=...
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/scrymagic
```

Using the root `docker-compose.yml` recommender database service:

```bash
DATABASE_URL=postgres://recommender:recommender@127.0.0.1:5433/scrymagic_recommender
```

Optional:

```bash
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
PORT=3000
```

If `DATABASE_URL` is not provided, the service uses `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`.

## Database requirements

The service automatically runs:

- `CREATE EXTENSION IF NOT EXISTS vector`
- table creation for `card_embeddings`
- ivfflat indexes for oracle/flavor/visual embedding columns

Ensure your PostgreSQL instance has pgvector installed.

## Start pgvector from root compose

From the repository root:

```bash
docker compose --profile recommender up -d recommender-db
```

To stop it:

```bash
docker compose --profile recommender stop recommender-db
```

## Run

```bash
npm install
npm run start:dev
```

Then run an ingest call before querying recommendations.
