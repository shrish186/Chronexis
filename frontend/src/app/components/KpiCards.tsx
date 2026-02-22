"use client";

import type { SimRun, VentureModel } from "@/app/lib/api";

interface Props {
  simRun:       SimRun;
  ventureModel: VentureModel;
  deadlineDays: number;
  runwayDays:   number;
}

/* Animated SVG ring */
function Ring({ value, color }: { value: number; color: string }) {
  const r    = 32;
  const circ = 2 * Math.PI * r;
  const v    = isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const pct  = Math.round(v * 100);

  return (
    <div className="relative" style={{ width: 84, height: 84 }}>
      <svg width="84" height="84" className="-rotate-90">
        <circle cx="42" cy="42" r={r} fill="none"
          stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle cx="42" cy="42" r={r} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="butt"
          strokeDasharray={`${circ * v} ${circ}`}
          style={{
            filter:     `drop-shadow(0 0 5px ${color}70)`,
            transition: "stroke-dasharray 1.3s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-mono font-semibold"
          style={{ fontSize: 15, color, lineHeight: 1 }}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}

function riskLabel(p: number, threshHigh: number, threshMed: number) {
  return p >= threshHigh ? "LOW RISK" : p >= threshMed ? "MODERATE" : "HIGH RISK";
}
function riskColor(p: number, threshHigh: number, threshMed: number) {
  return p >= threshHigh ? "var(--jade)" : p >= threshMed ? "var(--ember)" : "var(--blood)";
}

export default function KpiCards({ simRun, ventureModel, deadlineDays, runwayDays }: Props) {
  const ot = isFinite(simRun.onTimeProbability)       ? simRun.onTimeProbability       : 0;
  const rw = isFinite(simRun.withinRunwayProbability) ? simRun.withinRunwayProbability : 0;
  const otColor = riskColor(ot, 0.65, 0.35);
  const rwColor = riskColor(rw, 0.75, 0.45);

  // Top bottleneck
  const topBnEntry = Object.entries(simRun.topBottlenecks ?? {})
    .sort((a, b) => b[1] - a[1])[0];
  const topBnModule = ventureModel.modules.find((m) => m.id === topBnEntry?.[0]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      {/* On-time */}
      <div className="card card-jade p-5 rise d-1 flex flex-col gap-3">
        <div className="sec-label">On-Time Probability</div>
        <Ring value={ot} color={otColor} />
        <div>
          <div className="tag" style={{
            color: otColor,
            background: `${otColor}14`,
            border: `1px solid ${otColor}30`,
          }}>
            {riskLabel(ot, 0.65, 0.35)}
          </div>
          <div className="sec-label mt-2">deadline: {deadlineDays}d</div>
        </div>
      </div>

      {/* Within runway */}
      <div className="card card-ember p-5 rise d-2 flex flex-col gap-3">
        <div className="sec-label">Within Runway</div>
        <Ring value={rw} color={rwColor} />
        <div>
          <div className="tag" style={{
            color: rwColor,
            background: `${rwColor}14`,
            border: `1px solid ${rwColor}30`,
          }}>
            {riskLabel(rw, 0.75, 0.45)}
          </div>
          <div className="sec-label mt-2">runway: {Math.round(runwayDays / 30)}mo</div>
        </div>
      </div>

      {/* P50 / P90 */}
      <div className="card card-arctic p-5 rise d-3 flex flex-col gap-3">
        <div className="sec-label">Percentile Finish</div>
        <div className="flex-1 flex flex-col justify-center gap-3">
          <div>
            <div className="sec-label mb-1">P50 · median</div>
            <div className="font-mono font-semibold" style={{ fontSize: 28, color: "var(--arctic)", lineHeight: 1 }}>
              {simRun.p50Days ?? "—"}
              <span className="sec-label ml-1" style={{ fontSize: 11 }}>days</span>
            </div>
          </div>
          <div>
            <div className="sec-label mb-1">P90 · tail risk</div>
            <div className="font-mono font-semibold" style={{ fontSize: 22, color: "var(--ember)", lineHeight: 1 }}>
              {simRun.p90Days ?? "—"}
              <span className="sec-label ml-1" style={{ fontSize: 11 }}>days</span>
            </div>
          </div>
          <div className="sec-label">mean: {simRun.meanDays}d · {simRun.nRuns} runs</div>
        </div>
      </div>

      {/* Top bottleneck */}
      <div className="card card-blood p-5 rise d-4 flex flex-col gap-3">
        <div className="sec-label">Top Bottleneck</div>
        <div className="flex-1 flex flex-col justify-center gap-2">
          {topBnModule ? (
            <>
              <div className="font-display font-bold uppercase" style={{ fontSize: 14, color: "var(--ember)", letterSpacing: "0.04em", lineHeight: 1.3 }}>
                {topBnModule.name}
              </div>
              <div className="sec-label">{topBnModule.id} · {topBnModule.category}</div>

              {/* Complexity dots */}
              <div className="flex items-center gap-2 mt-1">
                <span className="sec-label">cplx</span>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="w-2 h-2 rounded-sm"
                      style={{ background: j < topBnModule.complexity ? "var(--ember)" : "rgba(255,255,255,0.06)" }}
                    />
                  ))}
                </div>
                <span className="sec-label">uncert</span>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="w-2 h-2 rounded-sm"
                      style={{ background: j < topBnModule.uncertainty ? "var(--blood)" : "rgba(255,255,255,0.06)" }}
                    />
                  ))}
                </div>
              </div>

              {/* Bottleneck frequency bar */}
              {topBnEntry && (
                <div className="mt-1">
                  <div className="prob-track">
                    <div className="prob-fill" style={{
                      width: `${(topBnEntry[1] / simRun.nRuns) * 100}%`,
                      background: "var(--blood)",
                    }} />
                  </div>
                  <div className="sec-label mt-1">
                    {topBnEntry[1]} runs ({((topBnEntry[1] / simRun.nRuns) * 100).toFixed(0)}%)
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="sec-label">No bottleneck data</div>
          )}
        </div>
      </div>

    </div>
  );
}