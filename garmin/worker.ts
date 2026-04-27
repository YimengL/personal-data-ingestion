

interface Env {
    PERSONAL_AI_DB: D1Database;
    GARMIN_WORKER_TOKEN: string;
}

interface WeightMeasurement {
    id: string;
    measured_at: string;
    weight_kg: number;
}


export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const auth = request.headers.get("Authorization");
        if (auth !== `Bearer ${env.GARMIN_WORKER_TOKEN}`) {
            return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(request.url);

        if (request.method === "POST" && url.pathname === "/garmin/body-composition") {
            return handlePost(request, env);
        }
        if (request.method === "GET" && url.pathname === "/garmin/body-composition/latest") {
            return handleGetLatest(env);
        }

        return new Response("Not Found", { status: 404 });
    }
};


async function handlePost(request: Request, env: Env): Promise<Response> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    if (!Array.isArray(body)) {
        return new Response("Expected array", { status: 400 });
    }

    for (const item of body) {
        if (
            typeof item.id !== "string" ||
            typeof item.measured_at !== "string" ||
            typeof item.weight_kg !== "number"
        ) {
            return new Response("Invalid measurement shape", { status: 400 });
        }
    }

    if (body.length === 0) {
        return new Response("ok");
    }

    const now = new Date().toISOString();
    const stmts = (body as WeightMeasurement[]).map((m) =>
        env.PERSONAL_AI_DB.prepare(
            `INSERT INTO garmin_body_composition (id, measured_at, weight_kg, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
            measured_at = excluded.measured_at,
            weight_kg = excluded.weight_kg,
            updated_at = ?`
        ).bind(m.id, m.measured_at, m.weight_kg, now, now, now)
    );
    await env.PERSONAL_AI_DB.batch(stmts);

    return new Response("ok");
}


async function handleGetLatest(env: Env): Promise<Response> {
    const row = await env.PERSONAL_AI_DB.prepare(
        `SELECT measured_at FROM garmin_body_composition ORDER BY measured_at DESC LIMIT 1`
    ).first<{ measured_at: string }>();
    return Response.json({ measured_at: row?.measured_at ?? null });
}