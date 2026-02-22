"use client";

interface Props { roleOverload: Record<string, number>; }

const ROLE_COLOR: Record<string, string> = {
  frontend: "var(--arctic)",
  backend:  "var(--ember)",
  data:     "#a78bfa",
  infra:    "#fb923c",
  business: "var(--jade)",
  legal:    "#f472b6",
};

export default function RoleOverload({ roleOverload }: Props) {
  const entries = Object.entries(roleOverload).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;

  return (
    <div className="card card-arctic p-5 space-y-4">
      <div className="sec-label mb-1">Role Utilization</div>
      <div className="space-y-3">
        {entries.map(([role, util]) => {
          const isOver = util > 1.15;
          const isNear = util > 0.9 && !isOver;
          const col    = isOver ? "var(--blood)" : isNear ? "var(--ember)" : "var(--jade)";
          const status = isOver ? "OVERLOADED" : isNear ? "AT CAPACITY" : "OK";

          return (
            <div key={role} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: ROLE_COLOR[role] ?? "#6b7e96" }}
                  />
                  <span className="font-mono" style={{ fontSize: 12, color: "#a8b8cc" }}>{role}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="tag"
                    style={{ color: col, background: `${col}14`, border: `1px solid ${col}35` }}
                  >
                    {status}
                  </span>
                  <span className="font-mono font-semibold" style={{ fontSize: 13, color: col }}>
                    {(util * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="prob-track">
                <div
                  className="prob-fill"
                  style={{ width: `${Math.min(util * 100, 100)}%`, background: col, opacity: 0.75 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="sec-label">utilization = avg module load ÷ (headcount × deadline)</p>
    </div>
  );
}