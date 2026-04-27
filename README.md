# Personal Data Ingestion

Application-side ingestion code for personal data sources.

This repo currently contains:

- Garmin weight fetch client
- Docker runtime for the Garmin client
- GitHub Actions workflow for the daily Garmin fetch
- Apple ingestion Worker prototype

Pure infrastructure provisioning, such as Terraform-created Cloudflare resources,
belongs in `personal-ai-infra`.

## Garmin Weight

The Garmin client authenticates with Garmin Connect using `garminconnect`,
fetches measurements from the last stored date to today using a watermark from the Worker,
normalizes them, and POSTs the batch to the Garmin Worker.

If the database is empty, it fetches today only. If Garmin or GitHub Actions is down for
several days, the next successful run catches up automatically.

## Local Run

Secrets are read from environment variables:

- `GARMIN_EMAIL`
- `GARMIN_PASSWORD`
- `GARMIN_WORKER_URL`
- `GARMIN_WORKER_TOKEN`

Doppler is the preferred source of truth:

```bash
doppler run -- python garmin/garmin_client.py
```

Docker run:

```bash
docker build -t garmin-client -f garmin/Dockerfile .
docker run --rm --env-file <(doppler secrets download --no-file --format docker) garmin-client
```

## Garmin Worker

The Garmin Worker accepts normalized body composition data and stores it in D1.

### Endpoints

- `POST /garmin/body-composition` — batch upsert of measurements
- `GET /garmin/body-composition/latest` — returns the latest `measured_at` or `null`

All endpoints require an `Authorization: Bearer <GARMIN_WORKER_TOKEN>` header.

### Local dev

```bash
cd garmin
npm install
npx wrangler dev
```

## GitHub Actions

`.github/workflows/garmin-daily.yml` builds the Garmin Docker image and runs the
fetch daily.

The workflow requires this GitHub secret:

- `DOPPLER_TOKEN`
