"use client";

import type { SimInsights } from "@/app/lib/api";

interface Props { insights: SimInsights; }

export default function InsightsPanel({ insights }: Props) {
  const summary = Array.isArray(insights?.executiveSummary) ? insights.executiveSummary : [];
  const recs    = Array.isArray(insights?.recommendations)  ? insights.recommendations  : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Executive summary */}
      <div className="card card-jade p-5 space-y-4">
        <div className="sec-label">Executive Summary</div>

        <ul className="space-y-3">
          {summary.map((bullet, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="font-mono flex-shrink-0 mt-0.5"
                style={{ color: "var(--jade)", fontSize: 12 }}
              >
                ▸
              </span>
              <span style={{ fontSize: 14, color: "#d5dde8", lineHeight: 1.6 }}>{bullet}</span>
            </li>
          ))}
        </ul>

        {insights?.primaryFailureMode && (
          <div
            className="mt-2 pt-3 border-t"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="sec-label mb-2">Primary Failure Mode</div>
            <p className="font-mono" style={{ fontSize: 12, color: "var(--blood)", lineHeight: 1.6 }}>
              {insights.primaryFailureMode}
            </p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="card card-ember p-5 space-y-4">
        <div className="sec-label">Recommendations</div>

        <ol className="space-y-3">
          {recs.map((rec, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="font-mono font-semibold flex-shrink-0 w-6 h-6 flex items-center justify-center mt-0.5"
                style={{
                  fontSize: 11,
                  color: "var(--ember)",
                  background: "rgba(240,165,0,0.1)",
                  border: "1px solid rgba(240,165,0,0.25)",
                  borderRadius: 2,
                  lineHeight: 1,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 14, color: "#d5dde8", lineHeight: 1.6 }}>{rec}</span>
            </li>
          ))}
        </ol>
      </div>

    </div>
  );
}