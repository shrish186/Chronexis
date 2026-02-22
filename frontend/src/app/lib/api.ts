const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export type TeamRole  = "frontend" | "backend" | "data" | "infra" | "business" | "legal";
export type TeamLevel = "junior"   | "mid"     | "senior";

export interface TeamMember {
  name:  string;
  role:  TeamRole;
  level: TeamLevel;
}

export interface VentureInput {
  ideaText:     string;
  market:       string;
  revenueModel: string;
  deadlineDays: number;
  runwayMonths: number;
  team:         TeamMember[];
}

export interface VentureModule {
  id:                   string;
  name:                 string;
  category:             string;
  complexity:           number;
  uncertainty:          number;
  externalDependencies: string[];
  riskDrivers:          string[];
}

export interface VentureModel {
  _id:         string;
  ventureId:   string;
  summary:     string;
  assumptions: string[];
  globalRisks: string[];
  modules:     VentureModule[];
}

export interface VentureResponse {
  ventureId:      string;
  ventureModelId: string;
  ventureModel:   VentureModel;
}

export interface SimInsights {
  executiveSummary:     string[];
  primaryFailureMode:   string;
  mostCriticalModuleId: string;
  recommendations:      string[];
}

export interface SimRun {
  _id:                    string;
  ventureId:              string;
  ventureModelId:         string;
  nRuns:                  number;
  seed:                   number;
  deadlineDays:           number;
  runwayMonths:           number;
  onTimeProbability:      number;
  withinRunwayProbability:number;
  p50Days:                number;
  p90Days:                number;
  meanDays:               number;
  finishDays:             number[];
  topBottlenecks:         Record<string, number>;
  topFailureModes:        Record<string, number>;
  roleOverload:           Record<string, number>;
  insights:               SimInsights;
}

// ── Utility ────────────────────────────────────────────────────────────────

async function fetchJSON<T>(
  url:       string,
  init?:     RequestInit,
  timeoutMs: number = 90_000
): Promise<T> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError")
      throw new Error("Request timed out — the server may still be processing. Try again.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function createVenture(input: VentureInput): Promise<VentureResponse> {
  return fetchJSON<VentureResponse>(`${API}/api/venture`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(input),
  }, 60_000);
}

export async function runSimulation(params: {
  ventureId:      string;
  ventureModelId: string;
  nRuns?:         number;
  seed?:          number;
}): Promise<SimRun> {
  return fetchJSON<SimRun>(`${API}/api/simulate`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ nRuns: 800, seed: 42, ...params }),
  }, 120_000);
}

export async function getSimRun(simRunId: string): Promise<SimRun> {
  return fetchJSON<SimRun>(`${API}/api/results/${simRunId}`, {}, 15_000);
}