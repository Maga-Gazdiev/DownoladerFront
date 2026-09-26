import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./public/", import.meta.url));
const port = Number(process.env.PORT || 3001);
const backend = new URL(process.env.BACKEND_URL || "http://127.0.0.1:8085");
const token = process.env.WEB_API_TOKEN || "";
const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
]);

function json(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(value));
}

async function proxy(req, res) {
  if (!token)
    return json(res, 503, { error: "Сервис ещё не настроен. Попробуй позже." });
  const controller = new AbortController();
  const abort = () => controller.abort();
  res.once("close", abort);
  try {
    const headers = { authorization: `Bearer ${token}` };
    for (const name of ["content-type", "range", "if-range"]) {
      if (req.headers[name]) headers[name] = req.headers[name];
    }
    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192)
          return json(res, 413, { error: "Запрос слишком большой" });
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }
    const upstream = await fetch(new URL(req.url, backend), {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(30 * 60 * 1000),
      ]),
    });
    const responseHeaders = {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    };
    for (const name of [
      "content-type",
      "content-length",
      "content-disposition",
      "accept-ranges",
      "content-range",
    ]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders[name] = value;
    }
    res.writeHead(upstream.status, responseHeaders);
    if (!upstream.body) return res.end();
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch {
    if (controller.signal.aborted) return;
    if (!res.headersSent)
      json(res, 502, { error: "Сервис временно недоступен. Попробуй позже." });
    else res.destroy();
  } finally {
    controller.abort();
    res.off("close", abort);
  }
}

function staticFile(req, res) {
  const asset = assets.get(new URL(req.url, "http://localhost").pathname);
  if (!asset) return json(res, 404, { error: "Не найдено" });
  const [name, contentType] = asset;
  const path = join(root, name);
  try {
    const info = statSync(path);
    res.writeHead(200, {
      "content-type": contentType,
      "content-length": info.size,
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
    });
    if (req.method === "HEAD") return res.end();
    const stream = createReadStream(path);
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  } catch {
    if (!res.headersSent) json(res, 404, { error: "Не найдено" });
    else res.destroy();
  }
}

createServer((req, res) => {
  if (req.url.startsWith("/api/")) return void proxy(req, res);
  if (req.method !== "GET" && req.method !== "HEAD")
    return json(res, 405, { error: "Метод не поддерживается" });
  staticFile(req, res);
}).listen(port, "0.0.0.0", () =>
  console.log(`Frontend: http://0.0.0.0:${port}`),
);
