export default {
    async fetch(request: Request, env: any): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === "POST" && url.pathname === "/apple/data") {
            return handleAppleData(request, env);
        }

        return new Response("Not Found", { status: 404 });
    }
};

async function handleAppleData(request: Request, env: any): Promise<Response> {
    const token = request.headers.get("Authorization");
    if (token !== `Bearer ${env.AUTH_TOKEN}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    console.log("Apple data received:", JSON.stringify(body));
    return new Response("OK");
}