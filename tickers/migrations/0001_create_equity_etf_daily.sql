CREATE TABLE equity_etf_daily (
    ticker          TEXT NOT NULL,
    date            TEXT NOT NULL,
    price           REAL NOT NULL,
    currency        TEXT NOT NULL,
    trailing_pe     REAL,
    eps_ttm         REAL,
    week_52_high    REAL,
    week_52_low     REAL,
    source          TEXT,
    fetched_at      TEXT NOT NULL,
    PRIMARY KEY (ticker, date)
);