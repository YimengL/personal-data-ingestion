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
fetches today's weight entries, normalizes them, and prints JSON to stdout.

Output shape:

```json
[
  {
    "id": "example-measurement-id",
    "measured_at": "2026-04-26T10:13:26.004000+00:00",
    "weight_kg": 70.0
  }
]
```

If there is no weight entry for today, the output is:

```json
[]
```

## Local Run

Secrets are read from environment variables:

- `GARMIN_EMAIL`
- `GARMIN_PASSWORD`

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
