# ScryMagic Scheduler Sidecar

A Next.js sidecar app to schedule and monitor background jobs.

Current supported job type:

- `recommender_scryfall_ingest` (triggers and monitors recommender ingest API jobs)

## Features

- Show list of scheduled jobs on the main dashboard
- Create jobs from a dedicated page
- Edit jobs from a dedicated job details page
- Enable/disable jobs
- Delete jobs
- Trigger jobs manually (Run Now)
- Show global run history on the main dashboard
- View per-job details and per-job run history on a dedicated job page
- View per-run details payload in the job details UI
- Persist all jobs and run history in PostgreSQL

## Environment Variables

Required:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/scrymagic_scheduler
RECOMMENDER_API_BASE_URL=http://127.0.0.1:3001
```

Optional:

```bash
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=scrymagic_scheduler
PGUSER=postgres
PGPASSWORD=postgres
SCHEDULER_TICK_MS=15000
RECOMMENDER_POLL_MS=5000
RECOMMENDER_MAX_POLL_MS=3600000
```

`DATABASE_URL` takes precedence over PG\* variables.

## Run

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000`

The scheduler engine starts on app startup (Node runtime) and processes due jobs on a fixed tick.

## API Endpoints

- `GET /api/dashboard` - jobs + latest run history
- `GET /api/runs?page=1&pageSize=20&search=...` - paginated searchable run history
- `GET /api/jobs` - list jobs
- `POST /api/jobs` - create job
- `GET /api/jobs/:id` - job details
- `PATCH /api/jobs/:id` - edit job
- `DELETE /api/jobs/:id` - delete job and associated runs
- `GET /api/jobs/:id/runs?page=1&pageSize=20&search=...` - paginated searchable run history for a single job
- `POST /api/jobs/:id/run` - trigger manual run now

## Docker Compose (root)

From repository root:

```bash
docker compose up -d recommender-db recommender scheduler-db scheduler
```

If you previously used the old scheduler-db mount path and get a PostgreSQL 18+ data-directory error, remove the old scheduler volume once:

```bash
docker compose down
docker volume rm scrymagic_scheduler_pgdata
```

Then start again:

```bash
docker compose up -d recommender-db recommender scheduler-db scheduler
```

Scheduler UI:

- `http://localhost:3002`

## Notes

- Cron validation uses timezone-aware parsing.
- Runs are tracked in `scheduler_job_runs`.
- For recommender ingest jobs, this service:
  1.  Calls recommender `POST /api/recommender/ingest/scryfall/start`
  2.  Polls recommender status endpoint until terminal state
  3.  Saves final status/details to history
