import { sqliteTable, text, real, primaryKey } from "drizzle-orm/sqlite-core";

export const equityEtfDaily = sqliteTable(
    "equity_etf_daily",
    {
        ticker: text("ticker").notNull(),
        date: text("date").notNull(),
        price: real("price").notNull(),
        currency: text("currency").notNull(),
        trailingPe: real("trailing_pe"),
        epsTtm: real("eps_ttm"),
        week52High: real("week_52_high"),
        week52Low: real("week_52_low"),
        source: text("source"),
        fetchedAt: text("fetched_at").notNull(),
    },
    (t) => [primaryKey({ columns: [t.ticker, t.date] })]
);

export const tickerMetadata = sqliteTable("ticker_metadata", {
    ticker: text("ticker").primaryKey(),
    type: text("type").notNull(),
    exchange: text("exchange"),
    country: text("country"),
    currency: text("currency"),
    longName: text("long_name"),
    firstSeen: text("first_seen").notNull(),
    updatedAt: text("updated_at").notNull(),
});