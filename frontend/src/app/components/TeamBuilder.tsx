"use client";

import type { TeamMember, TeamRole, TeamLevel } from "@/app/lib/api";

const ROLES:  TeamRole[]  = ["frontend","backend","data","infra","business","legal"];
const LEVELS: TeamLevel[] = ["junior","mid","senior"];

const ROLE_COLOR: Record<TeamRole, string> = {
  frontend: "#4cc9f0",
  backend:  "#f0a500",
  data:     "#a78bfa",
  infra:    "#fb923c",
  business: "#2ec4b6",
  legal:    "#f472b6",
};

interface Props {
  team:     TeamMember[];
  onChange: (team: TeamMember[]) => void;
}

export default function TeamBuilder({ team, onChange }: Props) {
  const add    = () => onChange([...team, { name: "", role: "backend", level: "mid" }]);
  const remove = (i: number) => onChange(team.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<TeamMember>) =>
    onChange(team.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  return (
    <div className="space-y-2">
      {team.length === 0 && (
        <p className="sec-label text-center py-4">No team members yet — add at least one.</p>
      )}

      {team.map((m, i) => (
        <div key={i} className="grid gap-2" style={{ gridTemplateColumns: "1fr 130px 96px 32px" }}>
          <input
            className="field text-sm"
            placeholder={`Member ${i + 1}`}
            value={m.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />

          <select
            className="field text-sm"
            value={m.role}
            style={{ color: ROLE_COLOR[m.role] }}
            onChange={(e) => update(i, { role: e.target.value as TeamRole })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r} style={{ color: ROLE_COLOR[r] }}>{r}</option>
            ))}
          </select>

          <select
            className="field text-sm"
            value={m.level}
            onChange={(e) => update(i, { level: e.target.value as TeamLevel })}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn-danger-ghost flex items-center justify-center w-8 h-[38px] text-lg leading-none"
            onClick={() => remove(i)}
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      ))}

      <button type="button" className="btn-ghost w-full mt-1" onClick={add}>
        + Add member
      </button>
    </div>
  );
}