import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db";
import ventureRouter from "./routes/venture";
import simulateRouter from "./routes/simulate";
import resultsRouter from "./routes/results";

const app = express();
const PORT = process.env.PORT || 4000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Accept comma-separated list so staging + local both work
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / Postman / server-side
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: ${origin} not in allowed list`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.options("*", cors()); // pre-flight

app.use(express.json({ limit: "4mb" }));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

app.use("/api/venture", ventureRouter);
app.use("/api/simulate", simulateRouter);
app.use("/api/results", resultsRouter);

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[ERROR]", err.message);
  const status = (err as NodeJS.ErrnoException).code === "ECONNREFUSED" ? 503 : 500;
  res.status(status).json({ error: err.message });
});

// ─── Process-level safety nets (keep server alive during demo) ────────────────

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err.message);
});

// ─── Start ────────────────────────────────────────────────────────────────────

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[backend] http://localhost:${PORT}`);
      console.log(`[backend] CORS origins: ${allowedOrigins.join(", ")}`);
    });
  })
  .catch((err: Error) => {
    console.error("[FATAL] MongoDB connection failed:", err.message);
    process.exit(1);
  });