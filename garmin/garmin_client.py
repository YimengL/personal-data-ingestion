import os
import sys
from datetime import datetime, UTC
import json

from garminconnect import Garmin

GARMIN_EMAIL = os.getenv("GARMIN_EMAIL")
GARMIN_PASSWORD = os.getenv("GARMIN_PASSWORD")

if not GARMIN_EMAIL or not GARMIN_PASSWORD:
    sys.exit("GARMIN_EMAIL and GARMIN_PASSWORD must be set")

client = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
client.login()
today = datetime.now(UTC).date().isoformat()
data = client.get_body_composition(today, today)

normalized = [
    {
        "id": str(item["samplePk"]),
        "measured_at": datetime.fromtimestamp(item["timestampGMT"] / 1000, tz=UTC).isoformat(),
        "weight_kg": item["weight"] / 1000,
    } for item in data.get("dateWeightList", [])
]

print(json.dumps(normalized, indent=2))
