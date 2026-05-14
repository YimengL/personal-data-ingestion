import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { equityEtfDaily, tickerMetadata } from "./schema";

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
                    updatedAt: now,
                },
            })
    );

    await db.batch(queries as any);

    return new Response("ok");   
}