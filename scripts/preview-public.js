import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const prefix = "/funnelback-prototype/";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (!url.pathname.startsWith(prefix)) throw new Error("Outside project");
    const relative =
      decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html";
    const file = path.resolve(root, relative);
    if (
      !file.startsWith(`${root}${path.sep}`) &&
      file !== path.join(root, "index.html")
    )
      throw new Error("Outside artifact");
    if (!(await stat(file)).isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  }
});
server.listen(4175, "127.0.0.1", () =>
  console.log(`Public artifact: http://127.0.0.1:4175${prefix}`),
);
