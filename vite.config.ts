import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

/** Serves the Vercel-style handlers in api/manus/*.ts during `vite` so the browser never needs the Manus key. */
function manusApiDev(): Plugin {
  return {
    name: "manus-api-dev",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv("development", process.cwd(), "");
      for (const [key, value] of Object.entries(env)) {
        if (key.startsWith("MANUS_") && process.env[key] === undefined) process.env[key] = value;
      }

      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/manus\/(assessment|message|status)(?:\?|$)/);
        if (!match) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [name, value] of Object.entries(req.headers)) {
            if (typeof value === "string") headers.set(name, value);
          }
          const hasBody = req.method !== "GET" && req.method !== "HEAD";
          const request = new Request(`http://${req.headers.host ?? "localhost"}${req.url}`, {
            method: req.method,
            headers,
            body: hasBody ? Buffer.concat(chunks) : undefined,
          });
          const mod = await server.ssrLoadModule(`/api/manus/${match[1]}.ts`);
          const handler = mod[req.method ?? "GET"] as ((r: Request) => Promise<Response> | Response) | undefined;
          const response = handler ? await handler(request) : new Response("Method not allowed", { status: 405 });
          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          server.config.logger.error(String(error));
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: { code: "internal", message: "Something went wrong. Please try again." } }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), manusApiDev()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
    dedupe: ["react", "react-dom", "three"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "@react-three/postprocessing",
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api/sleep-prediction": "http://127.0.0.1:8787",
    },
  },
});
