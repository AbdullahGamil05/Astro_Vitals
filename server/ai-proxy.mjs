// Reference backend for the AI analysis endpoint. Run with: node server/ai-proxy.mjs
//
// The model API key is read from the server environment only (AI_API_KEY, no VITE_ prefix),
// so it never reaches the browser bundle. Point VITE_AI_ANALYSIS_ENDPOINT at this server.
//
//   AI_UPSTREAM_URL  URL of your model service. It receives the AnalysisRequest JSON and must
//                    answer with an AnalysisResponse (schema in src/services/ai/schema.ts).
//   AI_API_KEY       Credential for that upstream service.
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 8787);
const upstream = process.env.AI_UPSTREAM_URL;
const apiKey = process.env.AI_API_KEY;
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "http://localhost:5173";

const cors = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function send(res, status, body) {
  res.writeHead(status, { ...cors, "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method !== "POST" || req.url !== "/api/ai-analysis") return send(res, 404, { error: "Not found" });
  if (!upstream || !apiKey) return send(res, 503, { error: "AI_UPSTREAM_URL and AI_API_KEY are not configured." });

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 256_000) return send(res, 413, { error: "Payload too large" });
  }

  try {
    const upstreamResponse = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: Buffer.concat(chunks),
    });
    const text = await upstreamResponse.text();
    res.writeHead(upstreamResponse.status, { ...cors, "Content-Type": "application/json" });
    res.end(text);
  } catch {
    send(res, 502, { error: "Upstream analysis service unreachable" });
  }
}).listen(PORT, () => console.log(`AI proxy listening on http://localhost:${PORT}/api/ai-analysis`));
