"use client";

import type { VentureModule } from "@/app/lib/api";

interface Props {
  modules:              VentureModule[];
  criticalModuleId?:    string;
  topBottleneckId?:     string;
}

const DRIVER_PALETTE: Record<string, string> = {
  security:              "#e63946",
  compliance:            "#f472b6",
  integration:           "#fb923c",
  third_party_api:       "#f0a500",
  unknown_requirements:  "#a78bfa",
  scope_creep:           "#c084fc",
  data_quality:          "#4cc9f0",
  performance:           "#60a5fa",
  vendor_lockin:         "#f87171",
  go_to_market:          "#2ec4b6",
  sales_cycle:           "#34d399",
};
function dc(d: string): string {
  return DRIVER_PALETTE[d] ?? "#6b7e96";
}

export default function RiskHeatmap({ modules, criticalModuleId, topBottleneckId }: Props) {
  const allDrivers = Array.from(new Set(modules.flatMap((m) => m.riskDrivers))).sort();

  if (!modules.length || !allDrivers.length) return (
    <div className="card p-8 flex items-center justify-center">
      <span className="sec-label">No risk driver data</span>
    </div>
  );

  const colTemplate = `minmax(160px,220px) repeat(${allDrivers.length}, minmax(32px,44px))`;

  return (
    <div className="card card-ember p-5 space-y-4">
      <div className="sec-label mb-1">Module × Risk Driver Exposure</div>

      {/* Colour legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {allDrivers.map((d) => (
          <span key={d} className="flex items-center gap-1.5 font-mono" style={{ fontSize: 10, color: dc(d) }}>
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: dc(d) }} />
            {d.replace(/_/g, "\u00a0")}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ display: "grid", gridTemplateColumns: colTemplate, gap: 1, minWidth: "max-content" }}>

          {/* Header: blank + driver labels rotated */}
          <div style={{ height: 88 }} />
          {allDrivers.map((d) => (
            <div
              key={`h-${d}`}
              className="flex items-end justify-center pb-2"
              style={{ height: 88 }}
              title={d}
            >
              <span
                className="font-mono block"
                style={{
                  fontSize: 9,
                  color: dc(d),
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  maxHeight: 80,
                  overflow: "hidden",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {d.replace(/_/g, " ")}
              </span>
            </div>
          ))}

          {/* Module rows */}
          {modules.map((mod) => {
            const isCrit = mod.id === criticalModuleId;
            const isBot  = mod.id === topBottleneckId && !isCrit;
            const dSet   = new Set(mod.riskDrivers);

            return (
              <>
                {/* Module name cell */}
                <div
                  key={`n-${mod.id}`}
                  className="flex items-center gap-2 py-2 pr-3 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}
                >
                  <span
                    className="font-mono text-xs truncate"
                    style={{
                      color: isCrit ? "var(--ember)" : isBot ? "var(--arctic)" : "#a8b8cc",
                      maxWidth: 180,
                    }}
                    title={mod.name}
                  >
                    {mod.name}
                  </span>
                  {isCrit && (
                    <span className="tag flex-shrink-0" style={{
                      color: "var(--ember)",
                      background: "rgba(240,165,0,0.12)",
                      border: "1px solid rgba(240,165,0,0.3)",
                    }}>CRIT</span>
                  )}
                  {isBot && (
                    <span className="tag flex-shrink-0" style={{
                      color: "var(--arctic)",
                      background: "rgba(76,201,240,0.1)",
                      border: "1px solid rgba(76,201,240,0.25)",
                    }}>BTN</span>
                  )}
                </div>

                {/* Driver cells */}
                {allDrivers.map((d) => {
                  const has = dSet.has(d);
                  return (
                    <div
                      key={`c-${mod.id}-${d}`}
                      className="flex items-center justify-center border-t"
                      style={{ borderColor: "rgba(255,255,255,0.04)", height: 38 }}
                      title={has ? `${mod.name} → ${d}` : undefined}
                    >
                      {has ? (
                        <div
                          style={{
                            width: 14, height: 14,
                            borderRadius: 2,
                            background: dc(d),
                            opacity: 0.8,
                            boxShadow: `0 0 6px ${dc(d)}55`,
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 14, height: 14,
                          borderRadius: 2,
                          background: "rgba(255,255,255,0.04)",
                        }} />
                      )}
                    </div>
                  );
                })}
              </>
            );
          })}
        </div>
      </div>

      <div className="flex gap-5 pt-1" style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "#6b7e96" }}>
        <span>CRIT = AI-identified most critical module</span>
        <span>BTN = highest bottleneck frequency in simulation</span>
      </div>
    </div>
  );
}