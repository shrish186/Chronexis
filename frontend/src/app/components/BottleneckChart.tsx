"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Cell,
} from "recharts";
import type { VentureModule } from "@/app/lib/api";

interface Props {
  topBottlenecks: Record<string, number>;
  modules:        VentureModule[];
  nRuns:          number;
}

function Tip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullName: string; count: number; pct: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card px-3 py-2" style={{ fontSize: 11 }}>
      <div className="font-mono" style={{ color: "#a8b8cc", maxWidth: 200 }}>{d.fullName}</div>
      <div className="font-mono font-semibold mt-0.5" style={{ color: "var(--ember)" }}>
        {d.count} runs · {d.pct}
      </div>
    </div>
  );
}

export default function BottleneckChart({ topBottlenecks, modules, nRuns }: Props) {
  const modMap  = new Map(modules.map((m) => [m.id, m]));
  const topId   = Object.entries(topBottlenecks).sort((a, b) => b[1] - a[1])[0]?.[0];

  const data = Object.entries(topBottlenecks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([id, count]) => {
      const mod = modMap.get(id);
      const name = mod?.name ?? id;
      return {
        id,
        label:    name.length > 22 ? name.slice(0, 21) + "…" : name,
        fullName: name,
        count,
        pct:      `${((count / nRuns) * 100).toFixed(1)}%`,
      };
    });

  if (!data.length) return (
    <div className="card p-8 flex items-center justify-center">
      <span className="sec-label">No bottleneck data</span>
    </div>
  );

  return (
    <div className="card card-arctic p-5">
      <div className="sec-label mb-5">Critical Path Bottlenecks</div>
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
            type="category" dataKey="label" width={160}
            tick={{ fill: "#a8b8cc", fontSize: 10, fontFamily: "IBM Plex Mono" }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="count" radius={[0, 2, 2, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.id === topId ? "var(--ember)" : "var(--arctic)"}
                opacity={d.id === topId ? 0.9 : 0.45}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}