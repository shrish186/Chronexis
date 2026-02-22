import type { VentureModel, VentureModule, SimInsights, TeamMember } from "./types";


const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


async function callGemini(prompt: string, retries = 3): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const url = `${GEMINI_URL}?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  };

  let lastErr: Error = new Error("Unknown Gemini error");
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
        error?: { message: string };
      };

      if (data.error) throw new Error(`Gemini API error: ${data.error.message}`);

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!text) throw new Error("Gemini returned empty content");
      return text;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.warn(`[gemini] attempt ${attempt}/${retries}: ${lastErr.message}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  throw lastErr;
}


export function extractJSON(raw: string): string {
  // Strip ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();

  // Find first { or [
  const so = raw.indexOf("{");
  const sa = raw.indexOf("[");
  if (so === -1 && sa === -1) throw new Error("No JSON found in Gemini response");

  let start: number;
  let open: string;
  let close: string;
  if (so === -1) { start = sa; open = "["; close = "]"; }
  else if (sa === -1) { start = so; open = "{"; close = "}"; }
  else { start = Math.min(so, sa); open = raw[start] === "{" ? "{" : "["; close = open === "{" ? "}" : "]"; }

  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\" && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === open) depth++;
    else if (ch === close && --depth === 0) return raw.slice(start, i + 1);
  }
  throw new Error("Malformed JSON in Gemini response");
}


const VENTURE_MODEL_PROMPT = `You are a startup strategy analyst + senior software architect + risk modeler.
Analyze the startup idea and return ONLY valid JSON.
Input:
Startup Idea (can be long): {{IDEA_TEXT}}
Target Market: {{MARKET}}
Revenue Model: {{REVENUE_MODEL}}
Deadline in days: {{DEADLINE_DAYS}}
Runway months: {{RUNWAY_MONTHS}}
Team (role and level): {{TEAM_JSON}}
Output schema (return JSON only):
{
  "summary": string,
  "assumptions": string[],
  "globalRisks": string[],
  "modules": [
    {
      "id": "M1",
      "name": string,
      "category": "frontend"|"backend"|"data"|"infra"|"business"|"legal",
      "complexity": 1|2|3|4|5,
      "uncertainty": 1|2|3|4|5,
      "externalDependencies": string[],
      "riskDrivers": string[]
    }
  ]
}
Rules:
- Create 8 to 14 modules.
- Include at least: 1 legal OR compliance module if the idea touches finance/health/identity/payments.
- riskDrivers must be short tokens like:
  "third_party_api","integration","security","compliance","unknown_requirements",
  "performance","data_quality","scope_creep","vendor_lockin","go_to_market","sales_cycle"
- externalDependencies should be concrete but generic, e.g. "payment_processor","calendar_provider","cloud_storage".
- Do NOT output markdown. JSON only.`;

export interface RawVentureModel {
  summary: string;
  assumptions: string[];
  globalRisks: string[];
  modules: VentureModule[];
}

function validateVentureModelShape(obj: unknown): RawVentureModel {
  if (typeof obj !== "object" || obj === null) throw new Error("Not an object");
  const m = obj as Record<string, unknown>;
  if (typeof m.summary !== "string") throw new Error("Missing summary");
  if (!Array.isArray(m.assumptions)) throw new Error("Missing assumptions");
  if (!Array.isArray(m.globalRisks)) throw new Error("Missing globalRisks");
  if (!Array.isArray(m.modules) || m.modules.length < 1)
    throw new Error("Missing or empty modules array");

  const modules: VentureModule[] = (m.modules as unknown[]).map((raw, i) => {
    if (typeof raw !== "object" || raw === null) throw new Error(`Module ${i} not object`);
    const mod = raw as Record<string, unknown>;
    return {
      id: String(mod.id ?? `M${i + 1}`),
      name: String(mod.name ?? `Module ${i + 1}`),
      category: (["frontend","backend","data","infra","business","legal"].includes(mod.category as string)
        ? mod.category
        : "backend") as VentureModule["category"],
      complexity: ([1,2,3,4,5].includes(Number(mod.complexity))
        ? Number(mod.complexity)
        : 3) as VentureModule["complexity"],
      uncertainty: ([1,2,3,4,5].includes(Number(mod.uncertainty))
        ? Number(mod.uncertainty)
        : 3) as VentureModule["uncertainty"],
      externalDependencies: Array.isArray(mod.externalDependencies)
        ? (mod.externalDependencies as unknown[]).map(String)
        : [],
      riskDrivers: Array.isArray(mod.riskDrivers)
        ? (mod.riskDrivers as unknown[]).map(String)
        : [],
    };
  });

  return {
    summary: m.summary as string,
    assumptions: (m.assumptions as unknown[]).map(String),
    globalRisks: (m.globalRisks as unknown[]).map(String),
    modules,
  };
}

export async function generateVentureModel(params: {
  ideaText: string;
  market: string;
  revenueModel: string;
  deadlineDays: number;
  runwayMonths: number;
  team: TeamMember[];
}): Promise<RawVentureModel> {
  const prompt = VENTURE_MODEL_PROMPT
    .replace("{{IDEA_TEXT}}", params.ideaText)
    .replace("{{MARKET}}", params.market)
    .replace("{{REVENUE_MODEL}}", params.revenueModel)
    .replace("{{DEADLINE_DAYS}}", String(params.deadlineDays))
    .replace("{{RUNWAY_MONTHS}}", String(params.runwayMonths))
    .replace("{{TEAM_JSON}}", JSON.stringify(params.team));

  let raw = await callGemini(prompt);
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJSON(raw));
    return validateVentureModelShape(parsed);
  } catch (firstErr) {
    // Hard validation failed — retry once with a fix instruction
    console.warn("[gemini] venture model validation failed, retrying with fix prompt:", (firstErr as Error).message);
    const fixPrompt = `The following JSON is malformed or incomplete. Fix it so it matches this schema exactly and return ONLY the corrected JSON:\n${raw}\n\nRequired schema:\n${JSON.stringify({
      summary: "string",
      assumptions: ["string"],
      globalRisks: ["string"],
      modules: [{
        id: "M1", name: "string", category: "backend",
        complexity: 3, uncertainty: 3,
        externalDependencies: [], riskDrivers: []
      }]
    }, null, 2)}`;

    raw = await callGemini(fixPrompt);
    parsed = JSON.parse(extractJSON(raw));
    return validateVentureModelShape(parsed);
  }
}

// ─── Insights prompt + generation ────────────────────────────────────────────

const INSIGHTS_PROMPT = `You are an engineering + venture risk analyst.
Given the venture model and simulation summary, return ONLY valid JSON.
Venture model: {{VENTURE_MODEL_JSON}}
Simulation summary:
{
  "deadlineDays": {{DEADLINE_DAYS}},
  "runwayMonths": {{RUNWAY_MONTHS}},
  "onTimeProbability": {{ON_TIME_PROB}},
  "withinRunwayProbability": {{WITHIN_RUNWAY_PROB}},
  "p50Days": {{P50}},
  "p90Days": {{P90}},
  "topFailureModes": {{TOP_FAILURE_MODES}},
  "topBottlenecks": {{TOP_BOTTLENECKS}},
  "roleOverload": {{ROLE_OVERLOAD}}
}
Output schema:
{
  "executiveSummary": string[],
  "primaryFailureMode": string,
  "mostCriticalModuleId": string,
  "recommendations": string[]
}
Rules:
- executiveSummary: exactly 3 bullet strings.
- recommendations: exactly 4 bullet strings, each starting with a strong verb.
- primaryFailureMode: one short sentence.
- mostCriticalModuleId must match an id in the venture model.
Return JSON only.`;

function validateInsightsShape(obj: unknown, validModuleIds: string[]): SimInsights {
  if (typeof obj !== "object" || obj === null) throw new Error("Not an object");
  const m = obj as Record<string, unknown>;

  const execSummary = Array.isArray(m.executiveSummary)
    ? (m.executiveSummary as unknown[]).map(String).slice(0, 3)
    : ["Analysis unavailable.", "Please review manually.", ""];
  while (execSummary.length < 3) execSummary.push("");

  const recs = Array.isArray(m.recommendations)
    ? (m.recommendations as unknown[]).map(String).slice(0, 4)
    : ["Review risk drivers.", "Adjust timeline.", "Add buffer.", "Monitor bottleneck."];
  while (recs.length < 4) recs.push("Address identified risks.");

  const moduleId = validModuleIds.includes(m.mostCriticalModuleId as string)
    ? (m.mostCriticalModuleId as string)
    : validModuleIds[0] ?? "";

  return {
    executiveSummary: execSummary,
    primaryFailureMode: String(m.primaryFailureMode ?? "Execution risk exceeds runway buffer."),
    mostCriticalModuleId: moduleId,
    recommendations: recs,
  };
}

export async function generateInsights(params: {
  ventureModel: VentureModel;
  deadlineDays: number;
  runwayMonths: number;
  onTimeProbability: number;
  withinRunwayProbability: number;
  p50Days: number;
  p90Days: number;
  topFailureModes: Record<string, number>;
  topBottlenecks: Record<string, number>;
  roleOverload: Record<string, number>;
}): Promise<SimInsights> {
  // Strip MongoDB _id fields to keep prompt clean
  const modelForPrompt = {
    summary: params.ventureModel.summary,
    modules: params.ventureModel.modules.map((m) => ({
      id: m.id, name: m.name, category: m.category,
      complexity: m.complexity, uncertainty: m.uncertainty,
      riskDrivers: m.riskDrivers,
    })),
  };

  const prompt = INSIGHTS_PROMPT
    .replace("{{VENTURE_MODEL_JSON}}", JSON.stringify(modelForPrompt))
    .replace("{{DEADLINE_DAYS}}", String(params.deadlineDays))
    .replace("{{RUNWAY_MONTHS}}", String(params.runwayMonths))
    .replace("{{ON_TIME_PROB}}", params.onTimeProbability.toFixed(3))
    .replace("{{WITHIN_RUNWAY_PROB}}", params.withinRunwayProbability.toFixed(3))
    .replace("{{P50}}", String(params.p50Days))
    .replace("{{P90}}", String(params.p90Days))
    .replace("{{TOP_FAILURE_MODES}}", JSON.stringify(params.topFailureModes))
    .replace("{{TOP_BOTTLENECKS}}", JSON.stringify(params.topBottlenecks))
    .replace("{{ROLE_OVERLOAD}}", JSON.stringify(params.roleOverload));

  const validIds = params.ventureModel.modules.map((m) => m.id);

  try {
    const raw = await callGemini(prompt);
    const parsed = JSON.parse(extractJSON(raw));
    return validateInsightsShape(parsed, validIds);
  } catch (err) {
    console.warn("[gemini] insights generation failed, using fallback:", (err as Error).message);
    return {
      executiveSummary: [
        "Simulation completed but AI insights could not be generated.",
        `On-time probability: ${(params.onTimeProbability * 100).toFixed(1)}%.`,
        "Review the simulation data manually for risk assessment.",
      ],
      primaryFailureMode: "AI insight generation failed — review risk data directly.",
      mostCriticalModuleId: validIds[0] ?? "",
      recommendations: [
        "Review the top bottleneck modules and reduce their complexity.",
        "Allocate buffer time for high-uncertainty modules.",
        "Monitor role overload and redistribute work early.",
        "Validate external dependencies before sprint planning.",
      ],
    };
  }
}