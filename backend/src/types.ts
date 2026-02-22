// ─── Shared domain types ──────────────────────────────────────────────────────

export type TeamRole = "frontend" | "backend" | "data" | "infra" | "business" | "legal";
export type TeamLevel = "junior" | "mid" | "senior";
export type ModuleCategory = "frontend" | "backend" | "data" | "infra" | "business" | "legal";

export interface TeamMember {
  name: string;
  role: TeamRole;
  level: TeamLevel;
}

// ─── Venture (intake) ─────────────────────────────────────────────────────────

export interface Venture {
  _id: string;
  createdAt: Date;
  ideaText: string;
  market: string;
  revenueModel: string;
  deadlineDays: number;
  runwayMonths: number;
  team: TeamMember[];
}

// ─── Venture Model (Gemini output) ────────────────────────────────────────────

export interface VentureModule {
  id: string;
  name: string;
  category: ModuleCategory;
  complexity: 1 | 2 | 3 | 4 | 5;
  uncertainty: 1 | 2 | 3 | 4 | 5;
  externalDependencies: string[];
  riskDrivers: string[];
  // Computed after generation — not from Gemini directly
  dependencies?: string[];
}

export interface VentureModel {
  _id: string;
  ventureId: string;
  createdAt: Date;
  summary: string;
  assumptions: string[];
  globalRisks: string[];
  modules: VentureModule[];
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export interface SimInsights {
  executiveSummary: string[];
  primaryFailureMode: string;
  mostCriticalModuleId: string;
  recommendations: string[];
}

export interface SimRun {
  _id: string;
  ventureId: string;
  ventureModelId: string;
  createdAt: Date;
  nRuns: number;
  seed: number;
  deadlineDays: number;
  runwayMonths: number;
  // Core probabilities
  onTimeProbability: number;
  withinRunwayProbability: number;
  p50Days: number;
  p90Days: number;
  meanDays: number;
  // Distribution
  finishDays: number[];
  // Breakdowns
  topBottlenecks: Record<string, number>;   // moduleId -> count as bottleneck
  topFailureModes: Record<string, number>;  // mode label -> count
  roleOverload: Record<string, number>;     // role -> utilization ratio (>1 = overloaded)
  // AI insights
  insights: SimInsights;
}