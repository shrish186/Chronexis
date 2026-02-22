"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  topFailureModes: Record<string, number>;
  nRuns: number;
}

const MODE_COLOR: Record<string, string> = {
  on_time:                    "var(--jade)",
  runway_exhaustion:          "var(--blood)",
  scope_creep:                "var(--ember)",
  vendor_delay:               "#fb923c",
  "scope_creep+vendor_delay": "#f472b6",
};

function modeColor(m: string) {
  if (MODE_COLOR[m]) return MODE_COLOR[m];
  if (m.startsWith("bottleneck:")) return "var(--arctic)";
  return "#6b7e96";
}
function modeLabel(m: string) {
  if (m.startsWith("bottleneck:")) return "BN: " + m.slice(11);
  return m.replace(/_/g, " ");
}

function Tip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { pct: string; full: string; count: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card px-3 py-2" style={{ fontSize: 11 }}>
      <div className="sec-label max-w-[180px]">{d.full}</div>
      <div className="font-mono font-semibold mt-0.5" style={{ color: "var(--ember)" }}>
        {d.count} runs · {d.pct}
      </div>
    </div>
  );
}

export default function FailureModeChart({ topFailureModes, nRuns }: Props) {
  const data = Object.entries(topFailureModes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([mode, count]) => ({
      label: modeLabel(mode).slice(0, 22),
      full:  modeLabel(mode),
      count,
      pct:   `${((count / nRuns) * 100).toFixed(1)}%`,
      color: modeColor(mode),
    }));

  if (!data.length) return (
    <div className="card p-8 flex items-center justify-center">
      <span className="sec-label">No failure modes recorded</span>
    </div>
  );

  return (
    <div className="card card-blood p-5">
      <div className="sec-label mb-5">Failure Mode Frequency</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, left: 8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="2 6"
            stroke="rgba(255,255,255,0.04)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "#6b7e96", fontSize: 10, fontFamily: "IBM Plex Mono" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            type="category" dataKey="label" width={148}
            tick={{ fill: "#a8b8cc", fontSize: 10, fontFamily: "IBM Plex Mono" }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="count" radius={[0, 2, 2, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} opacity={0.82} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}