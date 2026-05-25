import os
import sys
import argparse
import logging
from datetime import datetime, timezone

import requests
import yaml
import yfinance as yf

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

WORKER_URL = os.getenv("TICKERS_WORKER_URL")
WORKER_TOKEN = os.getenv("TICKERS_WORKER_TOKEN")

if not all([WORKER_URL, WORKER_TOKEN]):
    sys.exit("TICKERS_WORKER_URL and TICKERS_WORKER_TOKEN must be set")

HEADERS = {"Authorization": f"Bearer {WORKER_TOKEN}"}

EXCHANGE_COUNTRY = {
    "GER": "DE",
    "LSE": "GB",
    "AMS": "NL",
    "PAR": "FR",
    "MIL": "IT",
    "NMS": "US",
    "NYQ": "US",
    "NGM": "US",
}

VALID_TYPES = {"equity_etf", "gold_etc", "bond_etf", "stock", "money_fund"}
WATCHLIST_PATH = os.path.join(os.path.dirname(__file__), "watchlist.yaml")


def derive_country(exchange):
    return EXCHANGE_COUNTRY.get(exchange)


def load_watchlist():
    with open(WATCHLIST_PATH) as f:
        data = yaml.safe_load(f)
    mappings = data.get("mappings", [])
    for m in mappings:
        if m["type"] not in VALID_TYPES:
            sys.exit(f"Invalid type '{m['type']}' for target={m['target']}")
    return mappings


def fetch_and_post_metadata(ticker, asset_type, portfolio=False):
    info = yf.Ticker(ticker).info
    payload = [{
        "ticker": ticker,
        "type": asset_type,
        "exchange": info.get("exchange"),
        "country": derive_country(info.get("exchange")),
        "currency": info.get("currency"),
        "long_name": info.get("longName"),
        "portfolio": 1 if portfolio else 0,
    }]
    resp = requests.post(
        f"{WORKER_URL}/tickers/metadata",
        headers=HEADERS,
        json=payload,
    )
    resp.raise_for_status()
    logging.info(f"Metadata upserted for {ticker}")


def fetch_and_post_daily(ticker, date_str):
    t = yf.Ticker(ticker)
    info = t.info
    now = datetime.now(timezone.utc).isoformat()
    payload = [{
        "ticker": ticker,
        "date": date_str,
        "price": info.get("regularMarketPrice"),
        "currency": info.get("currency"),
        "trailing_pe": info.get("trailingPE"),
        "eps_ttm": info.get("trailingEps"),
        "week_52_high": info.get("fiftyTwoWeekHigh"),
        "week_52_low": info.get("fiftyTwoWeekLow"),
        "source": "yfinance",
        "fetched_at": now
    }]
    if payload[0]["price"] is None:
        logging.warning(f"No price for {ticker} on {date_str}, skipping")
        return
    resp = requests.post(
        f"{WORKER_URL}/tickers/equity-etf-daily",
        headers=HEADERS,
        json=payload,
    )
    resp.raise_for_status()
    logging.info(f"Daily snapshot posted for {ticker} @ {date_str}")


def get_existing_tickers(date_str):
    resp = requests.get(
        f"{WORKER_URL}/tickers/equity-etf-daily",
        headers=HEADERS,
        params={"date": date_str},
    )
    resp.raise_for_status()
    return set(resp.json())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="Single date YYYY-MM-DD (default: today)")
    parser.add_argument("--reconcile", action="store_true",
                        help="Config-change mode: upsert metadata, skip existing tickers")
    args = parser.parse_args()

    date_str = args.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    mappings = load_watchlist()

    existing = set()
    if args.reconcile:
        existing = get_existing_tickers(date_str)
        logging.info(f"Already in DB for {date_str}: {existing or 'none'}")

    processed = set()
    for entry in mappings:
        tickers = [entry["target"]]
        if "origin" in entry:
            tickers.append(entry["origin"])
        for ticker in tickers:
            if ticker in processed:
                continue
            if ticker in existing:
                logging.info(f"Skipping {ticker} (already exists)")
                continue
            is_portfolio = entry.get("portfolio", False) and ticker == entry["target"]
            if args.reconcile:
                # only applies to the target, ignore the original
                fetch_and_post_metadata(ticker, entry["type"], is_portfolio)
            fetch_and_post_daily(ticker, date_str)
            processed.add(ticker)
    
    logging.info(f"Done. Processed {len(processed)} ticker(s) for {date_str}")

if __name__ == "__main__":
    main()
