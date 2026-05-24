CREATE TABLE portfolio_snapshots (
    ticker                  TEXT NOT NULL,
    date                    TEXT NOT NULL,
    value                   REAL NOT NULL,
    currency                TEXT NOT NULL DEFAULT 'EUR',
    monthly_contribution    REAL,
    created_at              TEXT NOT NULL,
    PRIMARY KEY (ticker, date)
);