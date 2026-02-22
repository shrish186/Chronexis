"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import TeamBuilder from "./components/TeamBuilder";
import { createVenture, runSimulation } from "./lib/api";
import { SAMPLE_VENTURE } from "./lib/sample";
import type { TeamMember } from "./lib/api";

const STEPS = [
  "Connecting to Gemini…",
  "Generating venture model…",
  "Identifying risk drivers…",
  "Running 800 Monte Carlo simulations…",
  "Computing critical path DAG…",
  "Analysing role utilization…",
  "Generating AI insights…",
  "Saving results…",
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="sec-label">{label}</label>
      {children}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [ideaText,     setIdeaText]     = useState("");
  const [market,       setMarket]       = useState("");
  const [revenueModel, setRevenueModel] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(90);
  const [runwayMonths, setRunwayMonths] = useState(8);
  const [team,         setTeam]         = useState<TeamMember[]>([
    { name: "", role: "backend",  level: "mid" },
    { name: "", role: "frontend", level: "mid" },
  ]);

  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState(0);
  const [error,    setError]    = useState<string | null>(null);
  const [mounted,  setMounted]  = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function fillSample() {
    setIdeaText(SAMPLE_VENTURE.ideaText);
    setMarket(SAMPLE_VENTURE.market);
    setRevenueModel(SAMPLE_VENTURE.revenueModel);
    setDeadlineDays(SAMPLE_VENTURE.deadlineDays);
    setRunwayMonths(SAMPLE_VENTURE.runwayMonths);
    setTeam(SAMPLE_VENTURE.team);
  }

  function stopInterval() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!ideaText.trim())     { setError("Startup idea is required."); return; }
    if (!market.trim())       { setError("Target market is required."); return; }
    if (!revenueModel.trim()) { setError("Revenue model is required."); return; }
    if (team.length === 0)    { setError("Add at least one team member."); return; }

    const deadline = Math.max(7,  Number(deadlineDays) || 90);
    const runway   = Math.max(1,  Number(runwayMonths) || 8);

    setLoading(true);
    setError(null);
    setStep(0);

    let s = 0;
    intervalRef.current = setInterval(() => {
      s = Math.min(s + 1, STEPS.length - 1);
      setStep(s);
    }, 2_800);

    try {
      const { ventureId, ventureModelId } = await createVenture({
        ideaText:     ideaText.trim(),
        market:       market.trim(),
        revenueModel: revenueModel.trim(),
        deadlineDays: deadline,
        runwayMonths: runway,
        team,
      });

      const simRun = await runSimulation({ ventureId, ventureModelId, nRuns: 800, seed: 42 });
      stopInterval();
      router.push(`/results/${simRun._id}`);
    } catch (err) {
      stopInterval();
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      {mounted && <div className="scan-overlay" onAnimationEnd={() => setMounted(false)} />}

      {/* ── Header ── */}
      <header className="border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="font-mono font-bold text-xs tracking-widest"
              style={{
                color: "var(--ember)",
                background: "rgba(240,165,0,0.1)",
                border: "1px solid rgba(240,165,0,0.25)",
                padding: "3px 8px",
                borderRadius: 2,
              }}
            >
              CHRONEXIS
            </div>
            <span className="sec-label hidden sm:block">venture risk simulator</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--jade)", boxShadow: "0 0 6px var(--jade)" }} />
            <span className="sec-label">system ready</span>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10 w-full">
        <div className="rise d-1">
          <h1
            className="font-display font-bold uppercase"
            style={{ fontSize: "clamp(32px, 6vw, 56px)", letterSpacing: "0.03em", lineHeight: 1.05, color: "#f0f4f8" }}
          >
            Simulate your venture<br />
            <span style={{ color: "var(--ember)" }}>before you build it.</span>
          </h1>
          <p className="mt-4 max-w-2xl" style={{ fontSize: 15, color: "#6b7e96", lineHeight: 1.7 }}>
            Enter your startup details. Gemini models 8–14 execution modules with risk drivers.
            800 Monte Carlo runs compute real probabilities — on-time delivery, runway survival,
            role overload, and critical path bottlenecks.
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <main className="flex-1 max-w-4xl mx-auto px-6 pb-20 w-full">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* 01 Venture brief */}
          <div className="card card-ember p-6 rise d-2 space-y-5">
            <div className="flex items-center justify-between mb-1">
              <div className="font-mono text-xs font-semibold tracking-widest" style={{ color: "var(--ember)" }}>
                01 / VENTURE BRIEF
              </div>
              <button type="button" onClick={fillSample} className="btn-ghost text-xs" disabled={loading}>
                ✦ Try sample idea
              </button>
            </div>

            <Field label="Startup idea — describe the product, problem, and differentiation">
              <textarea
                className="field"
                rows={5}
                placeholder="An AI-powered platform that…"
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                disabled={loading}
                required
                style={{ resize: "vertical", minHeight: 100 }}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Target market">
                <input
                  className="field"
                  placeholder="e.g. Mid-market B2B, legal teams"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  disabled={loading}
                  required
                />
              </Field>
              <Field label="Revenue model">
                <input
                  className="field"
                  placeholder="e.g. SaaS $49/seat/month"
                  value={revenueModel}
                  onChange={(e) => setRevenueModel(e.target.value)}
                  disabled={loading}
                  required
                />
              </Field>
            </div>
          </div>

          {/* 02 Constraints */}
          <div className="card card-arctic p-6 rise d-3 space-y-5">
            <div className="font-mono text-xs font-semibold tracking-widest mb-1" style={{ color: "var(--arctic)" }}>
              02 / CONSTRAINTS
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Deadline (days from today)">
                <div className="relative">
                  <input
                    type="number" className="field pr-12"
                    min={7} max={730}
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(Math.max(7, Number(e.target.value) || 90))}
                    disabled={loading}
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 sec-label">days</span>
                </div>
              </Field>
              <Field label="Runway (months of funding)">
                <div className="relative">
                  <input
                    type="number" className="field pr-12"
                    min={1} max={60}
                    value={runwayMonths}
                    onChange={(e) => setRunwayMonths(Math.max(1, Number(e.target.value) || 8))}
                    disabled={loading}
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 sec-label">mo</span>
                </div>
              </Field>
            </div>
          </div>

          {/* 03 Team */}
          <div className="card card-jade p-6 rise d-4 space-y-5">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs font-semibold tracking-widest" style={{ color: "var(--jade)" }}>
                03 / TEAM  ({team.length} member{team.length !== 1 ? "s" : ""})
              </div>
              <span className="sec-label">role affects module duration &amp; overload calc</span>
            </div>
            <TeamBuilder team={team} onChange={setTeam} />
          </div>

          {/* Error */}
          {error && (
            <div
              className="card p-4 font-mono text-sm rise"
              style={{ borderColor: "rgba(230,57,70,0.35)", color: "var(--blood)", background: "rgba(230,57,70,0.07)" }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="card p-5 space-y-4" style={{ borderColor: "rgba(240,165,0,0.2)", background: "rgba(240,165,0,0.04)" }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: "var(--ember)", boxShadow: "0 0 8px var(--ember)", animation: "pulse 1.4s ease-in-out infinite" }}
                />
                <span className="font-mono text-sm" style={{ color: "var(--ember)" }}>
                  {STEPS[step]}
                  <span style={{ animation: "blink 1s step-end infinite", display: "inline-block", marginLeft: 2 }}>▌</span>
                </span>
              </div>
              <div className="prob-track" style={{ height: 2 }}>
                <div className="prob-fill" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--jade), var(--ember))" }} />
              </div>
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? "var(--ember)" : "rgba(255,255,255,0.06)", transition: "background 0.3s" }} />
                ))}
              </div>
              <p className="sec-label">Step {step + 1}/{STEPS.length} · This takes 20–40 seconds</p>
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="btn-primary w-full" disabled={loading} style={{ fontSize: 13, padding: "16px 32px" }}>
            {loading ? "SIMULATING…" : "RUN SIMULATION →"}
          </button>

        </form>
      </main>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="sec-label">CHRONEXIS</span>
          <span className="sec-label">800 runs · Gemini 1.5 Flash · MongoDB Atlas</span>
        </div>
      </footer>
    </div>
  );
}