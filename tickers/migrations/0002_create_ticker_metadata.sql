CREATE TABLE ticker_metadata (
    ticker          TEXT PRIMARY KEY,
    type            TEXT NOT NULL,
    exchange        TEXT,
    country         TEXT,
    currency        TEXT,
    long_name       TEXT,
    first_seen      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);