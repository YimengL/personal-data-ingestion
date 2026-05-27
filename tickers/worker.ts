import { drizzle } from "drizzle-orm/d1";
import { eq, sql } from "drizzle-orm";
import { equityEtfDaily, tickerMetadata, portfolioSnapshots } from "./schema";

interface Env {
    PERSONAL_AI_DB: D1Database;
    TICKERS_WORKER_TOKEN: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {

        const auth = request.headers.get("Authorization");
        if (auth !== `Bearer ${env.TICKERS_WORKER_TOKEN}`) {
            return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(request.url);

        // POST /tickers/equity-etf-daily
        if (request.method === "POST" && url.pathname === "/tickers/equity-etf-daily") {
            return handlePostEquityEtfDaily(request, env);
        }
        // GET /tickers/equity-etf-daily?date=...
        if (request.method === "GET" && url.pathname === "/tickers/equity-etf-daily") {
            return handleGetEquityEtfDaily(url, env);
        }
        // POST /tickers/metadata
        if (request.method === "POST" && url.pathname === "/tickers/metadata") {
            return handlePostMetadata(request, env);
        }
        // GET /tickers/portfolio-snapshots
        if (request.method === "GET" && url.pathname === "/tickers/portfolio-snapshots") {
            return handleGetPortfolioSnapshots(url, env);
        }
        // GET /tickers/equity-etf-daily/price-range
        if (request.method === "GET" && url.pathname === "/tickers/equity-etf-daily/price-range") {
            return handleGetEquityPriceRange(url, env);
        }

        return new Response("Not Found", { status: 404 });
    },
};

async function handlePostEquityEtfDaily(request: Request, env: Env): Promise<Response> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    if (!Array.isArray(body)) {
        return new Response("Expected array", { status: 400 });
    }

    if (body.length === 0) {
        return new Response("ok");
    }

    const db = drizzle(env.PERSONAL_AI_DB);
    const queries = body.map((row: any) =>
        db.insert(equityEtfDaily)
            .values({
                ticker: row.ticker,
                date: row.date,
                price: row.price,
                currency: row.currency,
                trailingPe: row.trailing_pe ?? null,
                epsTtm: row.eps_ttm ?? null,
                week52High: row.week_52_high ?? null,
                week52Low: row.week_52_low ?? null,
                source: row.source ?? null,
                fetchedAt: row.fetched_at,
            })
            .onConflictDoUpdate({
                target: [equityEtfDaily.ticker, equityEtfDaily.date],
                set: {
                    price: row.price,
                    currency: row.currency,
                    trailingPe: row.trailing_pe ?? null,
                    epsTtm: row.eps_ttm ?? null,
                    week52High: row.week_52_high ?? null,
                    week52Low: row.week_52_low ?? null,
                    source: row.source ?? null,
                    fetchedAt: row.fetched_at,
                },
            })
    );
    await db.batch(queries as any);

    return new Response("ok");        
}

async function handleGetEquityEtfDaily(url: URL, env: Env): Promise<Response> {
    const date = url.searchParams.get("date");
    if (!date) {
        return new Response("Missing ?date= param", { status:400 });
    }

    const db = drizzle(env.PERSONAL_AI_DB);
    const rows = await db.select({ ticker: equityEtfDaily.ticker })
        .from(equityEtfDaily)
        .where(eq(equityEtfDaily.date, date));

    return Response.json(rows.map((r) => r.ticker));
}

async function handlePostMetadata(request: Request, env: Env): Promise<Response> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    if (!Array.isArray(body)) {
        return new Response("Expected array", { status: 400 });
    }

    if (body.length === 0) {
        return new Response("ok");
    }

    const now = new Date().toISOString();
    const db = drizzle(env.PERSONAL_AI_DB);
    const queries = body.map((row: any) =>
        db.insert(tickerMetadata)
            .values({
                ticker: row.ticker,
                type: row.type,
                exchange: row.exchange ?? null,
                country: row.country ?? null,
                currency: row.currency ?? null,
                longName: row.long_name ?? null,
                portfolio: row.portfolio ?? 0,
                firstSeen: now,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: tickerMetadata.ticker,
                set: {
                    type: row.type,
                    exchange: row.exchange ?? null,
                    country: row.country ?? null,
                    currency: row.currency ?? null,
                    longName: row.long_name ?? null,
                    portfolio: row.portfolio ?? 0,
                    updatedAt: now,
                },
            })
    );

    await db.batch(queries as any);

    return new Response("ok");   
}


async function handleGetPortfolioSnapshots(url: URL, env: Env): Promise<Response> {
    const db = drizzle(env.PERSONAL_AI_DB);
    const date = url.searchParams.get("date");

    let targetDate: string;
    if (date) {
        const nearest = await db.select({ date: portfolioSnapshots.date })
            .from(portfolioSnapshots)
            .where(sql`date <= ${date}`)
            .orderBy(sql`date DESC`)
            .limit(1);
        if (nearest.length === 0) {
            return Response.json([]);
        }
        targetDate = nearest[0].date;
    } else {
        const latest = await db.select({ date: portfolioSnapshots.date })
            .from(portfolioSnapshots)
            .orderBy(sql`date DESC`)
            .limit(1);

        if (latest.length === 0) {
            return Response.json([]);
        }
        targetDate = latest[0].date;
    }

    const rows = await db.select()
        .from(portfolioSnapshots)
        .where(eq(portfolioSnapshots.date, targetDate));
    
    return Response.json(rows);
}


async function handleGetEquityPriceRange(url: URL, env: Env): Promise<Response> {

    const ticker = url.searchParams.get("ticker");
    if (!ticker) {
        return new Response("Missing ?ticker= param", { status: 400 });
    }

    const db = drizzle(env.PERSONAL_AI_DB);

    const first = await db.select({ date: equityEtfDaily.date, price: equityEtfDaily.price })
        .from(equityEtfDaily)
        .where(eq(equityEtfDaily.ticker, ticker))
        .orderBy(sql`date ASC`)
        .limit(1);

    const last = await db.select({ date: equityEtfDaily.date, price: equityEtfDaily.price })
        .from(equityEtfDaily)
        .where(eq(equityEtfDaily.ticker, ticker))
        .orderBy(sql`date DESC`)
        .limit(1);
    
    if (first.length === 0) {
        return Response.json({ ticker, first: null, last: null });
    }

    return Response.json({ ticker, first: first[0], last: last[0]});
}