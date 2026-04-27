import os
import sys
import requests
import logging 
from datetime import UTC, datetime, timedelta, date
from garminconnect import Garmin

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

GARMIN_EMAIL = os.getenv("GARMIN_EMAIL")
GARMIN_PASSWORD = os.getenv("GARMIN_PASSWORD")
GARMIN_WORKER_URL = os.getenv("GARMIN_WORKER_URL")
GARMIN_WORKER_TOKEN = os.getenv("GARMIN_WORKER_TOKEN")

if not all([GARMIN_EMAIL, GARMIN_PASSWORD, GARMIN_WORKER_URL, GARMIN_WORKER_TOKEN]):
    sys.exit("GARMIN_EMAIL, GARMIN_PASSWORD, GARMIN_WORKER_URL and GARMIN_WORKER_TOKEN must be set")

client = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
client.login()
logging.info("Garmin login successful")

response = requests.get(
    f"{GARMIN_WORKER_URL}/garmin/body-composition/latest",
    headers={"Authorization": f"Bearer {GARMIN_WORKER_TOKEN}"},
)
response.raise_for_status()

today = datetime.now(UTC).date().isoformat() 
latest = response.json().get("measured_at")
if latest:
    start = (date.fromisoformat(latest[:10]) + timedelta(days=1)).isoformat()
else:
    start = today
logging.info(f"Latest stored: {latest or 'none'}, fetching from {start} to {today}")

data = client.get_body_composition(start, today)

normalized = [
    {
        "id": str(item["samplePk"]),
        "measured_at": datetime.fromtimestamp(item["timestampGMT"] / 1000, tz=UTC).isoformat(),
        "weight_kg": item["weight"] / 1000,
    } for item in data.get("dateWeightList", [])
]
logging.info(f"Fetched {len(normalized)} measurement(s) from Garmin")

resp = requests.post(
    f"{GARMIN_WORKER_URL}/garmin/body-composition",
    headers={"Authorization": f"Bearer {GARMIN_WORKER_TOKEN}"},
    json=normalized, 
)
resp.raise_for_status()
logging.info(f"Synced {len(normalized)} measurement(s) to Worker")   
