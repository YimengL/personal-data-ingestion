CREATE TABLE garmin_weight (
    id              TEXT PRIMARY KEY,
    measured_at     TEXT NOT NULL,
    weight_kg       REAL NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE INDEX idx_garmin_weight_measured_at ON garmin_weight (measured_at);