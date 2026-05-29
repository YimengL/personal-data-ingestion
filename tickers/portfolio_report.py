import os
import sys
import logging
from datetime import datetime, timedelta, timezone

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

WORKER_URL = os.getenv("TICKERS_WORKER_URL")
WORKER_TOKEN = os.getenv("TICKERS_WORKER_TOKEN")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

if not all([WORKER_URL, WORKER_TOKEN, DISCORD_WEBHOOK_URL]):
    sys.exit("TICKERS_WORKER_URL, TICKERS_WORKER_TOKEN, and DISCORD_WEBHOOK_URL must be set")

HEADERS = {"Authorization": f"Bearer {WORKER_TOKEN}"}


def fetch_snapshot(date=None):
    params = {"date": date} if date else {}
    resp = requests.get(f"{WORKER_URL}/tickers/portfolio-snapshots", headers=HEADERS, params=params)
    resp.raise_for_status()
    return resp.json()


def fetch_metadata():
    resp = requests.get(f"{WORKER_URL}/tickers/metadata", headers=HEADERS, params={"portfolio": "1"})
    resp.raise_for_status()
    return resp.json()


def fmt_delta(delta, pct):
    sign = "+" if delta >= 0 else ""
    return f"{sign}{delta:.2f} / {sign}{pct:.1f}%"


def fetch_price_range(ticker):
    resp = requests.get(f"{WORKER_URL}/tickers/equity-etf-daily/price-range", headers=HEADERS, params={"ticker": ticker})
    resp.raise_for_status()
    return resp.json()

def calculate_cagrs(metadata, curr_by_ticker):
    cagrs = {}
    for meta in metadata:
        ticker = meta["ticker"]
        if ticker not in curr_by_ticker or meta["type"] != "equity_etf":
            continue
        price_ticker = meta.get("origin") or ticker
        data = fetch_price_range(price_ticker)
        if not data["first"] or not data["last"]:
            continue

        first_price = data["first"]["price"]
        last_price = data["last"]["price"]
        days = (datetime.strptime(data["last"]["date"], "%Y-%m-%d")
                - datetime.strptime(data["first"]["date"], "%Y-%m-%d")).days
        if days <= 0 or first_price <= 0:
            continue

        years = days / 365.25
        cagrs[ticker] = (last_price / first_price) ** (1 / years) - 1
    return cagrs


def build_report(current, previous, metadata):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [f"**Portfolio Report — {today}**\n"]

    curr_by_ticker = {r["ticker"]: r for r in current}
    prev_by_ticker = {r["ticker"]: r for r in previous}

    total_now = 0
    total_prev = 0

    for ticker, row in curr_by_ticker.items():
        val = row["value"]
        total_now += val

        prev_row = prev_by_ticker.get(ticker)
        if prev_row:
            prev_val = prev_row["value"]
            total_prev += prev_val
            delta = val - prev_val
            pct = (delta / prev_val * 100) if prev_val else 0
            delta_str = f" ({fmt_delta(delta, pct)})"
        else:
            delta_str = " (new)"
        
        lines.append(f"• {ticker}: €{val:,.2f}{delta_str}")

    if total_prev:
        total_delta = total_now - total_prev
        total_pct = (total_delta / total_prev * 100)
        lines.append(f"Change: {fmt_delta(total_delta, total_pct)}")
    
    cagrs = calculate_cagrs(metadata, curr_by_ticker)
    projected_total = 0
    for ticker, row in curr_by_ticker.items():
        val = row["value"]
        monthly = row.get("monthly_contribution") or 0
        if ticker in cagrs and cagrs[ticker] != 0:
            r = cagrs[ticker] / 12
            projected_total += val * (1 + r) ** 12 + monthly * ((1 + r) ** 12 - 1) / r
        else:
            projected_total += val + monthly * 12

    lines.append(f"\n**1yr projection: €{projected_total:,.2f}**")

    return "\n".join(lines)


def post_to_discord(content):
    resp = requests.post(DISCORD_WEBHOOK_URL, json={"content": content})
    resp.raise_for_status()
    logging.info("Report posted to Discord")


def main():
    current = fetch_snapshot()
    if not current:
        sys.exit("No portfolio snapshots found")

    current_date = current[0]["date"]
    prev_date = (datetime.strptime(current_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
    previous = fetch_snapshot(date=prev_date)
    metadata = fetch_metadata()

    report = build_report(current, previous, metadata)
    logging.info(f"\n{report}")
    post_to_discord(report)


if __name__ == "__main__":
    main()
