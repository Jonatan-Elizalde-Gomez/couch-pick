import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./bindings";
import { rateLimitMiddleware } from "./lib/rateLimit";
import { auth } from "./routes/auth";
import { itemsRouter } from "./routes/items";
import { shuffleRouter } from "./routes/shuffle";

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());
app.use("*", rateLimitMiddleware);
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://couchpick.pages.dev"],
    credentials: true,
    allowHeaders: ["Content-Type", "x-couchpick-session"],
    exposeHeaders: ["x-couchpick-session"],
  })
);

app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.route("/auth", auth);
app.route("/items", itemsRouter);
app.route("/shuffle", shuffleRouter);

app.all("*", (c) => c.json({ error: "Not found" }, 404));

export default app;
