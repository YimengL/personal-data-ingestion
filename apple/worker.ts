export default {
    async fetch(request: Request, env: any): Promise<Response> {
        return new Response("Hello World");
    }
}