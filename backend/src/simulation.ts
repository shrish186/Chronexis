import { mulberry32, sampleNormal, clamp, percentile } from "./rng";
import type { VentureModel, VentureModule, TeamMember, TeamRole } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

// Base days per complexity point (1–5) — team level multiplied in
const BASE_DAYS_PER_COMPLEXITY = 8;

// 5 risk dimensions and their variance contribution
const RISK_DIMS = {
  executionVariance: 0.20,   // baseline ± noise
  scopeCreep: 0.15,          // chance of extra scope firing
  vendorDelay: 0.12,         // external dep delay
  roleOverloadPenalty: 0.18, // team capacity strain
  runwayExhaustion: 0.10,    // cost pressure forcing shortcuts
} as const;

// Level multipliers: senior is faster, junior slower
const LEVEL_MULT: Record<string, number> = {
  junior: 1.35,
  mid: 1.0,
  senior: 0.78,
};

// Category → preferred roles (for overload calc)
const CATEGORY_ROLES: Record<string, TeamRole[]> = {
  frontend:  ["frontend"],
  backend:   ["backend"],
  data:      ["data", "backend"],
  infra:     ["infra", "backend"],
  business:  ["business"],
  legal:     ["legal", "business"],
};

// ─── Dependency inference ─────────────────────────────────────────────────────
// If the model has no explicit dependencies, infer a reasonable linear chain
// based on category ordering: legal → infra → backend → data → frontend → business

const CATEGORY_ORDER: Record<string, number> = {
  legal: 0, infra: 1, backend: 2, data: 3, frontend: 4, business: 5,
};

export function inferDependencies(modules: VentureModule[]): VentureModule[] {
  // Check if any module already has deps defined
  const hasDeps = modules.some((m) => (m.dependencies ?? []).length > 0);
  if (hasDeps) return modules;

  // Sort by category order
  const sorted = [...modules].sort(
    (a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99)
  );

  // Each module depends on all modules of strictly lower category order
  return sorted.map((mod) => {
    const myOrder = CATEGORY_ORDER[mod.category] ?? 99;
    const deps = sorted
      .filter((other) => (CATEGORY_ORDER[other.category] ?? 99) < myOrder)
      .map((other) => other.id);
    return { ...mod, dependencies: deps };
  });
}

// ─── Topological sort with cycle detection ────────────────────────────────────

function topoSort(modules: VentureModule[]): VentureModule[] {
  const idMap = new Map(modules.map((m) => [m.id, m]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: VentureModule[] = [];

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) return; // cycle — skip back-edge
    visiting.add(id);
    const mod = idMap.get(id);
    if (mod) {
      for (const dep of mod.dependencies ?? []) visit(dep);
      result.push(mod);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const m of modules) visit(m.id);
  return result;
}

// ─── Critical path (earliest-finish DAG traversal) ───────────────────────────

function computeCriticalPath(
  sortedModules: VentureModule[],
  durations: Record<string, number>
): { totalDays: number; bottleneckId: string } {
  const earliest: Record<string, number> = {};

  for (const mod of sortedModules) {
    let depMax = 0;
    for (const dep of mod.dependencies ?? []) {
      const v = earliest[dep];
      if (v !== undefined && isFinite(v) && v > depMax) depMax = v;
    }
    const d = durations[mod.id];
    earliest[mod.id] = depMax + (isFinite(d) && d > 0 ? d : 1);
  }

  const maxFinish = Math.max(...Object.values(earliest).filter(isFinite), 1);

  // Bottleneck = module on critical path with largest own duration
  let bottleneckId = sortedModules[0]?.id ?? "M1";
  let maxDur = -1;
  for (const mod of sortedModules) {
    const finish = earliest[mod.id];
    if (finish === undefined) continue;
    if (Math.abs(finish - maxFinish) < 0.01) {
      const d = durations[mod.id] ?? 0;
      if (d > maxDur) { maxDur = d; bottleneckId = mod.id; }
    }
  }

  return { totalDays: maxFinish, bottleneckId };
}

// ─── Role capacity map ────────────────────────────────────────────────────────

function buildRoleCapacity(team: TeamMember[]): Record<TeamRole, number> {
  const cap: Partial<Record<TeamRole, number>> = {};
  for (const member of team) {
    cap[member.role] = (cap[member.role] ?? 0) + 1;
  }
  return cap as Record<TeamRole, number>;
}

// ─── Single-run module duration calculation ───────────────────────────────────

function moduleDuration(
  mod: VentureModule,
  team: TeamMember[],
  rng: () => number
): number {
  // Base duration from complexity
  const baseDays = mod.complexity * BASE_DAYS_PER_COMPLEXITY;

  // Adjust for team level: find the best-match member for this category
  const preferredRoles = CATEGORY_ROLES[mod.category] ?? ["backend"];
  const assignedMembers = team.filter((m) => preferredRoles.includes(m.role));
  const levelMult =
    assignedMembers.length > 0
      ? assignedMembers.reduce((sum, m) => sum + (LEVEL_MULT[m.level] ?? 1.0), 0) /
        assignedMembers.length
      : 1.2; // nobody assigned — penalty

  const mean = baseDays * levelMult;

  // Uncertainty drives std dev
  const stdDev = mean * (0.08 + mod.uncertainty * 0.06); // 0.14–0.38 of mean

  // 1. Execution variance — always applies
  let duration = sampleNormal(rng, mean, stdDev * RISK_DIMS.executionVariance * 10);

  // 2. Scope creep — fires probabilistically based on uncertainty
  const scopeCreepProb = 0.05 + mod.uncertainty * 0.08; // 0.13–0.45
  if (rng() < scopeCreepProb) {
    duration *= 1 + rng() * RISK_DIMS.scopeCreep * 4;
  }

  // 3. Vendor delay — fires if module has external deps
  if (mod.externalDependencies.length > 0 && rng() < 0.25) {
    duration += rng() * 10 * RISK_DIMS.vendorDelay * mod.externalDependencies.length;
  }

  // 4. Risk driver amplifiers
  const highRiskDrivers = ["compliance", "security", "unknown_requirements", "integration"];
  const matchingRisks = mod.riskDrivers.filter((r) => highRiskDrivers.includes(r)).length;
  if (matchingRisks > 0 && rng() < 0.3) {
    duration *= 1 + matchingRisks * 0.12;
  }

  return clamp(duration, baseDays * 0.4, baseDays * 5);
}

// ─── Failure mode detection ───────────────────────────────────────────────────

function classifyFailureMode(
  totalDays: number,
  deadlineDays: number,
  runwayDays: number,
  bottomModule: string,
  hasScopeCreep: boolean,
  hasVendorDelay: boolean
): string {
  if (totalDays > runwayDays) return "runway_exhaustion";
  if (totalDays > deadlineDays) {
    if (hasScopeCreep && hasVendorDelay) return "scope_creep+vendor_delay";
    if (hasScopeCreep) return "scope_creep";
    if (hasVendorDelay) return "vendor_delay";
    return `bottleneck:${bottomModule}`;
  }
  return "on_time";
}

// ─── Main simulation ──────────────────────────────────────────────────────────

export interface SimulationResult {
  onTimeProbability: number;
  withinRunwayProbability: number;
  p50Days: number;
  p90Days: number;
  meanDays: number;
  finishDays: number[];
  topBottlenecks: Record<string, number>;
  topFailureModes: Record<string, number>;
  roleOverload: Record<string, number>;
}

export function runSimulation(
  ventureModel: VentureModel,
  team: TeamMember[],
  deadlineDays: number,
  runwayMonths: number,
  seed: number,
  nRuns: number
): SimulationResult {
  const runwayDays = runwayMonths * 30;
  const safeSeed = (seed >>> 0) || 1;
  const rng = mulberry32(safeSeed);

  // Infer deps and topo-sort ONCE outside the hot loop
  const modulesWithDeps = inferDependencies(ventureModel.modules);
  const sortedModules = topoSort(modulesWithDeps);
  const roleCapacity = buildRoleCapacity(team);

  // Role workload accumulators (total days assigned per role across all runs)
  const roleTotalDays: Record<string, number> = {};
  const roleAssignedModules: Record<string, number> = {};

  const finishDays: number[] = [];
  const bottleneckCounts: Record<string, number> = {};
  const failureModeCounts: Record<string, number> = {};

  let onTimeCount = 0;
  let withinRunwayCount = 0;

  for (let i = 0; i < nRuns; i++) {
    const durations: Record<string, number> = {};
    let thisScopeCreep = false;
    let thisVendorDelay = false;

    for (const mod of sortedModules) {
      // Stash pre-scope-creep RNG state check via flag
      const scopeProb = 0.05 + mod.uncertainty * 0.08;
      const scopeRoll = rng();
      const vendorRoll = rng();
      const riskRoll = rng();
      // Re-do duration but consume RNG in same order as moduleDuration would
      // (We inline here for performance — avoids recreating a sub-RNG per call)
      const baseDays = mod.complexity * BASE_DAYS_PER_COMPLEXITY;
      const preferredRoles = CATEGORY_ROLES[mod.category] ?? ["backend"];
      const assignedMembers = team.filter((m) => preferredRoles.includes(m.role));
      const levelMult =
        assignedMembers.length > 0
          ? assignedMembers.reduce((sum, m) => sum + (LEVEL_MULT[m.level] ?? 1.0), 0) /
            assignedMembers.length
          : 1.2;

      const mean = baseDays * levelMult;
      const stdDev = Math.max(mean * 0.15, 0.5);

      // execution variance — uses 2 RNG calls (Box-Muller)
      const u1 = Math.max(rng(), 1e-12);
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      let dur = mean + stdDev * RISK_DIMS.executionVariance * 10 * z;

      // scope creep
      if (scopeRoll < scopeProb) {
        dur *= 1 + rng() * RISK_DIMS.scopeCreep * 4;
        thisScopeCreep = true;
      }

      // vendor delay
      if (mod.externalDependencies.length > 0 && vendorRoll < 0.25) {
        dur += rng() * 10 * RISK_DIMS.vendorDelay * mod.externalDependencies.length;
        thisVendorDelay = true;
      }

      // risk driver amplifier
      const highRisk = ["compliance","security","unknown_requirements","integration"];
      const matchRisks = mod.riskDrivers.filter((r) => highRisk.includes(r)).length;
      if (matchRisks > 0 && riskRoll < 0.3) {
        dur *= 1 + matchRisks * 0.12;
      }

      const finalDur = clamp(dur, baseDays * 0.4, baseDays * 5);
      durations[mod.id] = isFinite(finalDur) ? finalDur : baseDays;

      // Accumulate role workload
      const primaryRole = preferredRoles[0];
      roleTotalDays[primaryRole] = (roleTotalDays[primaryRole] ?? 0) + finalDur;
      roleAssignedModules[primaryRole] = (roleAssignedModules[primaryRole] ?? 0) + 1;
    }

    // 5th risk dimension: runway exhaustion penalty — if we're already over 80%
    // runway consumed, add a compression penalty (forced shortcuts)
    const { totalDays, bottleneckId } = computeCriticalPath(sortedModules, durations);
    let finish = totalDays;
    if (finish > runwayDays * 0.8) {
      finish *= 1 + rng() * RISK_DIMS.runwayExhaustion;
    } else {
      rng(); // consume RNG call to keep sequence consistent
    }

    const safeFinish = isFinite(finish) && finish > 0 ? Math.round(finish) : deadlineDays;
    finishDays.push(safeFinish);

    if (safeFinish <= deadlineDays) onTimeCount++;
    if (safeFinish <= runwayDays) withinRunwayCount++;

    bottleneckCounts[bottleneckId] = (bottleneckCounts[bottleneckId] ?? 0) + 1;

    const mode = classifyFailureMode(
      safeFinish, deadlineDays, runwayDays,
      bottleneckId, thisScopeCreep, thisVendorDelay
    );
    failureModeCounts[mode] = (failureModeCounts[mode] ?? 0) + 1;
  }

  // Sort finishDays for percentile calc
  const sorted = [...finishDays].sort((a, b) => a - b);

  // Role overload: utilization = totalDays / (capacity * deadlineDays)
  const roleOverload: Record<string, number> = {};
  for (const role of Object.keys(roleTotalDays)) {
    const cap = (roleCapacity as Record<string, number>)[role] ?? 0.5;
    const avgDays = roleTotalDays[role] / nRuns;
    roleOverload[role] = parseFloat((avgDays / (cap * deadlineDays)).toFixed(3));
  }

  // Top bottlenecks: top 5 by count
  const topBottlenecks = Object.fromEntries(
    Object.entries(bottleneckCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  );

  // Top failure modes: top 5
  const topFailureModes = Object.fromEntries(
    Object.entries(failureModeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  );

  const mean = finishDays.reduce((s, d) => s + d, 0) / finishDays.length;

  return {
    onTimeProbability: parseFloat((onTimeCount / nRuns).toFixed(4)),
    withinRunwayProbability: parseFloat((withinRunwayCount / nRuns).toFixed(4)),
    p50Days: percentile(sorted, 0.5),
    p90Days: percentile(sorted, 0.9),
    meanDays: parseFloat(mean.toFixed(1)),
    finishDays,
    topBottlenecks,
    topFailureModes,
    roleOverload,
  };
}