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

### 5) Start async ingestion job (progress-aware)

`POST /api/recommender/ingest/scryfall/start`

```json
{
  "limit": 20000,
  "batchSize": 256,
  "workerCount": 4
}
```

Returns a `jobId` and a status URL. The ingestion then runs in the background.

### 6) Poll ingestion status

`GET /api/recommender/ingest/scryfall/status/:jobId`

and

`GET /api/recommender/ingest/scryfall/status`

Status includes stage, processed/upserted counters, generated vs reused embedding counters, embedding API call count, fully reused card count, partially regenerated card count, batch progress, throughput (`cardsPerSecond`), ETA (`estimatedRemainingMs`), timings, and failures.

### 7) Cancel ingestion job

`POST /api/recommender/ingest/scryfall/cancel/:jobId`

Cancellation is cooperative: an in-flight batch finishes, then the job transitions to `cancelled`.

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
INGEST_LOG_PROGRESS_STEP=5
LOG_INGEST_BATCHES=false
```

If `DATABASE_URL` is not provided, the service uses `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`.

## Database requirements

The service automatically runs:

- `CREATE EXTENSION IF NOT EXISTS vector`
- table creation for `card_embeddings`
- ivfflat indexes for oracle/flavor/visual embedding columns

During ingestion, embeddings are only regenerated when the source content for that embedding type has changed. If a newly computed embedding would be `null`, an existing non-null embedding is preserved.

Ensure your PostgreSQL instance has pgvector installed.

## Start pgvector from root compose

From the repository root:

```bash
docker compose --profile recommender up -d recommender-db
```

If you previously ran this service with an older volume layout and still hit data-directory errors, remove the old volume once:

```bash
docker compose --profile recommender down
docker volume rm scrymagic_recommender_pgdata
```

Then start again:

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

When running in dev mode, the server prints:

- HTTP access logs for every request
- ingestion progress logs (start, milestone-based progress, completion/failure/cancellation)
- generated vs reused embedding counters so you can see how much OpenAI work was avoided
- embedding API call counts and card-level reuse metrics so you can quantify actual savings

For large ingestions, milestone-based progress logs are the default.

- `INGEST_LOG_PROGRESS_STEP=5` logs progress roughly every 5%
- `LOG_INGEST_BATCHES=true` enables verbose per-batch debug logging

## Test the service

From the repository root, start DB + sidecar:

```bash
docker compose --profile recommender up -d recommender-db recommender
docker compose --profile recommender ps
```

Smoke test:

```bash
curl -sS http://127.0.0.1:3001/api
```

Expected response:

```text
Hello World!
```

Ingest a small sample:

```bash
curl -sS -X POST http://127.0.0.1:3001/api/recommender/ingest/scryfall \
  -H "content-type: application/json" \
  -d '{"limit":200,"batchSize":16}'
```

Query by oracle text:

```bash
curl -sS -X POST http://127.0.0.1:3001/api/recommender/recommend/oracle \
  -H "content-type: application/json" \
  -d '{"query":"destroy target creature","limit":5}'
```

Start async ingestion and poll status:

```bash
curl -sS -X POST http://127.0.0.1:3001/api/recommender/ingest/scryfall/start \
  -H "content-type: application/json" \
  -d '{"limit":20000,"batchSize":256,"workerCount":4}'
```

```bash
curl -sS http://127.0.0.1:3001/api/recommender/ingest/scryfall/status/<JOB_ID>
```

Cancel a running job:

```bash
curl -sS -X POST http://127.0.0.1:3001/api/recommender/ingest/scryfall/cancel/<JOB_ID>
```

Query by flavor text:

```bash
curl -sS -X POST http://127.0.0.1:3001/api/recommender/recommend/flavor \
  -H "content-type: application/json" \
  -d '{"query":"a lonely knight under a blood moon","limit":5}'
```

Query by visual similarity (use a `card_id` from previous responses):

```bash
curl -sS -X POST http://127.0.0.1:3001/api/recommender/recommend/visual \
  -H "content-type: application/json" \
  -d '{"cardId":"<CARD_ID>","limit":5}'
```

Watch logs if anything fails:

```bash
docker compose --profile recommender logs -f recommender-db recommender
```
