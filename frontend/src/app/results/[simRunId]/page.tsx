export const dynamic    = "force-dynamic";
export const fetchCache = "force-no-store";

import Link from "next/link";
import { getSimRun } from "@/app/lib/api";
import type { VentureModel } from "@/app/lib/api";
import KpiCards         from "@/app/components/KpiCards";
import FinishHistogram  from "@/app/components/FinishHistogram";
import FailureModeChart from "@/app/components/FailureModeChart";
import BottleneckChart  from "@/app/components/BottleneckChart";
import RiskHeatmap      from "@/app/components/RiskHeatmap";
import InsightsPanel    from "@/app/components/InsightsPanel";
import RoleOverload     from "@/app/components/RoleOverload";
import SectionHeader    from "@/app/components/SectionHeader";

interface Props { params: { simRunId: string } }

const FALLBACK_VM: VentureModel = {
  _id: "", ventureId: "", summary: "", assumptions: [], globalRisks: [], modules: [],
};

export default async function ResultsPage({ params }: Props) {
  /* ── Fetch simRun ──────────────────────────────────────────── */
  let simRun;
  try {
    simRun = await getSimRun(params.simRunId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-5 max-w-md">
          <div className="font-display font-bold uppercase" style={{ fontSize: 48, color: "var(--blood)", letterSpacing: "0.06em" }}>
            NOT FOUND
          </div>
          <p style={{ color: "#6b7e96", fontSize: 14 }}>Could not load this simulation.</p>
          <p className="font-mono text-xs p-3 rounded" style={{
            color: "var(--blood)",
            background: "rgba(230,57,70,0.08)",
            border: "1px solid rgba(230,57,70,0.2)",
          }}>
            {msg}
          </p>
          <Link href="/" className="btn-ghost inline-block">← New simulation</Link>
        </div>
      </div>
    );
  }

  /* ── Fetch venture model (best-effort) ─────────────────────── */
  let ventureModel: VentureModel = FALLBACK_VM;
  try {
    const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
    const res = await fetch(`${API}/api/venture/model/${simRun.ventureModelId}`, { cache: "no-store" });
    if (res.ok) ventureModel = await res.json() as VentureModel;
  } catch { /* silent — page degrades gracefully */ }

  /* ── Derived values ────────────────────────────────────────── */
  const deadlineDays = simRun.deadlineDays ?? 90;
  const runwayDays   = (simRun.runwayMonths ?? 8) * 30;
  const modules      = ventureModel.modules ?? [];
  const insights     = simRun.insights ?? {
    executiveSummary: [], primaryFailureMode: "", mostCriticalModuleId: "", recommendations: [],
  };
  const topBnId = Object.entries(simRun.topBottlenecks ?? {})
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="min-h-screen">
      <div className="scan-overlay" />

      {/* ── Sticky nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b" style={{
        borderColor: "rgba(255,255,255,0.06)",
        background: "rgba(3,7,15,0.92)",
        backdropFilter: "blur(14px)",
      }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/" className="btn-ghost text-xs">← New sim</Link>
            <span className="font-mono hidden sm:block" style={{ fontSize: 10, color: "#3d5068" }}>
              {params.simRunId}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="sec-label">SEED <span className="font-mono ml-1" style={{ color: "#6b7e96" }}>{simRun.seed}</span></span>
            <span className="sec-label">RUNS <span className="font-mono ml-1" style={{ color: "var(--ember)" }}>{simRun.nRuns.toLocaleString()}</span></span>
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--jade)", boxShadow: "0 0 7px var(--jade)" }} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">

        {/* ── Hero ───────────────────────────────────────────────── */}
        <div className="rise d-1 space-y-3 border-b pb-10" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="sec-label">venture analysis complete</div>
          <h1 className="font-display font-bold uppercase" style={{
            fontSize: "clamp(22px, 3.5vw, 38px)",
            letterSpacing: "0.04em",
            color: "#f0f4f8",
            lineHeight: 1.15,
            maxWidth: "80ch",
          }}>
            {ventureModel.summary
              ? ventureModel.summary.slice(0, 130) + (ventureModel.summary.length > 130 ? "…" : "")
              : "Venture Simulation Results"}
          </h1>
          {(ventureModel.globalRisks ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {(ventureModel.globalRisks as string[]).slice(0, 5).map((r: string, i: number) => (
                <span key={i} className="tag" style={{
                  color: "#a8b8cc", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                }}>
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* §01 KPIs */}
        <section className="rise d-2">
          <SectionHeader
            index="01"
            title="Key Metrics"
            sub={`${simRun.nRuns} simulated timelines · deadline ${deadlineDays}d · runway ${simRun.runwayMonths ?? "?"}mo`}
          />
          <KpiCards
            simRun={simRun}
            ventureModel={ventureModel}
            deadlineDays={deadlineDays}
            runwayDays={runwayDays}
          />
        </section>

        {/* §02 Histogram */}
        <section className="rise d-3">
          <SectionHeader
            index="02"
            title="Finish Day Distribution"
            sub="how often the project completed in each time window"
            color="var(--jade)"
          />
          <FinishHistogram
            finishDays={simRun.finishDays ?? []}
            deadlineDays={deadlineDays}
            runwayDays={runwayDays}
          />
        </section>

        {/* §03–04 Charts */}
        <section className="rise d-4">
          <SectionHeader
            index="03 – 04"
            title="Risk Breakdown"
            sub="failure modes and bottleneck frequency across all runs"
            color="var(--blood)"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FailureModeChart topFailureModes={simRun.topFailureModes ?? {}} nRuns={simRun.nRuns} />
            <BottleneckChart  topBottlenecks={simRun.topBottlenecks ?? {}} modules={modules} nRuns={simRun.nRuns} />
          </div>
        </section>

        {/* §05 Heatmap */}
        <section className="rise d-5">
          <SectionHeader
            index="05"
            title="Risk Exposure Heatmap"
            sub="which modules carry which risk drivers from the venture model"
            color="var(--ember)"
          />
          <RiskHeatmap
            modules={modules}
            criticalModuleId={insights.mostCriticalModuleId}
            topBottleneckId={topBnId}
          />
        </section>

        {/* §06–07 Insights */}
        <section className="rise d-6">
          <SectionHeader
            index="06 – 07"
            title="AI Analysis"
            sub="Gemini's executive summary and actionable recommendations"
            color="var(--jade)"
          />
          <InsightsPanel insights={insights} />
        </section>

        {/* §08 Role Overload */}
        {Object.keys(simRun.roleOverload ?? {}).length > 0 && (
          <section className="rise d-7">
            <SectionHeader
              index="08"
              title="Role Utilization"
              sub="average workload per role relative to deadline capacity"
              color="var(--arctic)"
            />
            <RoleOverload roleOverload={simRun.roleOverload} />
          </section>
        )}

        {/* §09 Module breakdown */}
        {modules.length > 0 && (
          <section className="rise d-8">
            <SectionHeader
              index="09"
              title="Module Breakdown"
              sub={`${modules.length} execution modules identified by Gemini`}
              color="var(--arctic)"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((mod) => {
                const isCrit = mod.id === insights.mostCriticalModuleId;
                const isBot  = mod.id === topBnId && !isCrit;
                return (
                  <div
                    key={mod.id}
                    className="card p-4"
                    style={{
                      borderColor: isCrit ? "rgba(240,165,0,0.3)"
                                 : isBot  ? "rgba(76,201,240,0.2)"
                                 :           "rgba(255,255,255,0.06)",
                      background: isCrit ? "rgba(240,165,0,0.04)"
                                : isBot  ? "rgba(76,201,240,0.03)"
                                :           undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="font-mono" style={{ fontSize: 10, color: "#3d5068", marginBottom: 2 }}>
                          {mod.id}
                        </div>
                        <div className="font-body font-medium" style={{
                          fontSize: 13,
                          color: isCrit ? "var(--ember)" : "#d5dde8",
                          lineHeight: 1.4,
                        }}>
                          {mod.name}
                        </div>
                      </div>
                      <span className="tag flex-shrink-0" style={{
                        color: "var(--arctic)",
                        background: "rgba(76,201,240,0.08)",
                        border: "1px solid rgba(76,201,240,0.2)",
                      }}>
                        {mod.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[["complexity", mod.complexity, "var(--ember)"], ["uncertainty", mod.uncertainty, "var(--blood)"]].map(([label, val, col]) => (
                        <div key={String(label)}>
                          <div className="sec-label mb-1">{label}</div>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <div key={j} className="h-1 flex-1 rounded-sm" style={{
                                background: j < Number(val) ? String(col) : "rgba(255,255,255,0.06)",
                              }} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {mod.riskDrivers.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {mod.riskDrivers.map((rd) => (
                          <span key={rd} className="tag" style={{
                            fontSize: 8,
                            color: "#6b7e96",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}>
                            {rd.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}

                    {(isCrit || isBot) && (
                      <div className="mt-3 pt-2 border-t flex gap-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        {isCrit && <span className="tag" style={{ color: "var(--ember)", background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.25)" }}>CRITICAL</span>}
                        {isBot  && <span className="tag" style={{ color: "var(--arctic)", background: "rgba(76,201,240,0.08)", border: "1px solid rgba(76,201,240,0.2)" }}>TOP BTN</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center py-10 border-t space-y-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <Link href="/" className="btn-ghost">← Simulate a new venture</Link>
          <p className="sec-label block mt-3">
            COGNITIVE TWIN · seed {simRun.seed} · {simRun.nRuns} runs · Gemini 1.5 Flash · MongoDB Atlas
          </p>
        </div>

      </main>
    </div>
  );
}