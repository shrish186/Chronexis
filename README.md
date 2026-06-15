# Chronexis

**AI-powered venture risk simulation.** Chronexis models whether a startup or project will ship *on time* and *within runway* by running thousands of Monte Carlo simulations over a team's execution model, then uses Google Gemini to turn the raw statistics into plain-English risk insights.

🏆 **HackHer413 2026 Winner**

---

## What it does

You describe a venture — the team, the deadline, the runway, and a model of the work — and Chronexis simulates how it's likely to play out across hundreds of possible futures. Instead of a single optimistic guess, you get a probability distribution: how likely you are to hit the deadline, where you'll most likely get stuck, and which roles are overloaded.

For each simulation run, Chronexis reports:

- **On-time probability** — chance of finishing by the deadline
- **Within-runway probability** — chance of finishing before you run out of money
- **P50 / P90 finish days** — median and worst-case (90th percentile) completion times
- **Top bottlenecks** — the tasks most often on the critical path
- **Top failure modes** — the most common reasons runs miss the deadline
- **Role overload** — which team roles are over-allocated
- **AI insights** — a Gemini-generated narrative summarizing the risk and what to do about it

## How it works

1. **Define** a venture and its execution model (/api/venture).
2. **Simulate** — the engine runs a configurable number of Monte Carlo trials (default 800, capped 100–2,000). Each run uses a seeded RNG, so results are fully reproducible (/api/simulate).
3. **Analyze** — aggregated probabilities and percentiles are sent to Gemini, which generates human-readable risk insights.
4. **Persist** — every run is stored in MongoDB and retrievable later (/api/results).
5. **Visualize** — the Next.js dashboard renders probability distributions and runway projections with Recharts.

## Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MongoDB |
| **AI** | Google Gemini API |

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /health | Health check |
| POST | /api/venture | Create / manage a venture and its model |
| POST | /api/simulate | Run a Monte Carlo simulation and generate insights |
| GET | /api/results | Retrieve stored simulation runs |

## Running locally

Backend: cd backend && npm install && npm run dev (needs a .env with MONGODB_URI, GEMINI_API_KEY, FRONTEND_URL; runs on :4000)

Frontend: cd frontend && npm install && npm run dev (runs on :3000)

## Team

Built by a team of 3 at HackHer413 2026.
