"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  finishDays:  number[];
  deadlineDays: number;
  runwayDays:   number;
}

interface Bin { label: string; count: number; lo: number; hi: number; }

function makeBins(days: number[], n = 13): Bin[] {
  if (!days.length) return [];
  const lo  = Math.min(...days);
  const hi  = Math.max(...days);
  const sz  = Math.max(1, Math.ceil((hi - lo + 1) / n));
  const out = Array.from({ length: n }, (_, i): Bin => ({
    label: String(lo + i * sz),
    count: 0,
    lo:    lo + i * sz,
    hi:    lo + i * sz + sz - 1,
  }));
  for (const d of days) {
    const idx = Math.min(Math.floor((d - lo) / sz), n - 1);
    out[idx].count++;
  }
  return out;
}

function Tip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2" style={{ fontSize: 11 }}>
      <div className="sec-label">~{label}d</div>
      <div className="font-mono font-semibold mt-0.5" style={{ color: "var(--ember)" }}>
        {payload[0].value} runs
      </div>
    </div>
  );
}

export default function FinishHistogram({ finishDays, deadlineDays, runwayDays }: Props) {
  const bins    = makeBins(finishDays, 13);
  const maxCnt  = Math.max(...bins.map((b) => b.count), 1);

  if (!bins.length) return (
    <div className="card p-8 flex items-center justify-center">
      <span className="sec-label">No histogram data</span>
    </div>
  );

  const dlBin = bins.reduce((b, cur) =>
    Math.abs(cur.lo - deadlineDays) < Math.abs(b.lo - deadlineDays) ? cur : b);
  const rwBin = bins.reduce((b, cur) =>
    Math.abs(cur.lo - runwayDays) < Math.abs(b.lo - runwayDays) ? cur : b);

  return (
    <div className="card card-ember p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="sec-label mb-0.5">Finish Day Distribution</div>
          <p className="font-mono text-xs" style={{ color: "#6b7e96" }}>
            {finishDays.length} simulated timelines
          </p>
        </div>
        <div className="flex gap-5 text-xs font-mono" style={{ color: "#6b7e96" }}>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: "var(--jade)" }} />
            on-time
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: "var(--ember)" }} />
            late
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: "var(--blood)" }} />
            over runway
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: "var(--jade)" }} />
            deadline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: "var(--ember)" }} />
            runway
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={bins} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="2 6"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6b7e96", fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
            axisLine={false} tickLine={false}
            label={{ value: "days", position: "insideBottom", offset: -2, fill: "#3d5068", fontSize: 9, fontFamily: "IBM Plex Mono" }}
          />
          <YAxis
            tick={{ fill: "#6b7e96", fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
            axisLine={false} tickLine={false} width={28}
          />
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.025)" }} />

          <ReferenceLine
            x={dlBin.label}
            stroke="var(--jade)" strokeDasharray="3 3" strokeWidth={1.5}
            label={{ value: "DL", fill: "var(--jade)", fontSize: 9, fontFamily: "IBM Plex Mono" }}
          />
          {rwBin.label !== dlBin.label && (
            <ReferenceLine
              x={rwBin.label}
              stroke="var(--ember)" strokeDasharray="3 3" strokeWidth={1.5}
              label={{ value: "RW", fill: "var(--ember)", fontSize: 9, fontFamily: "IBM Plex Mono" }}
            />
          )}

          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {bins.map((bin, i) => {
              const col = bin.lo > runwayDays  ? "var(--blood)"
                        : bin.lo > deadlineDays ? "var(--ember)"
                        : "var(--jade)";
              return (
                <Cell
                  key={i}
                  fill={col}
                  opacity={0.3 + (bin.count / maxCnt) * 0.7}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}