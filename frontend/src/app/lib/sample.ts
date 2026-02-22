import type { VentureInput } from "./api";

export const SAMPLE_VENTURE: VentureInput = {
  ideaText: `An AI-powered B2B SaaS platform that automatically generates, negotiates, and tracks vendor contracts for mid-market companies. The system uses LLMs to perform real-time risk scoring on contract language, flag non-standard clauses, and suggest redlines — replacing manual legal review. Integrates with Salesforce, HubSpot, and DocuSign. Revenue via monthly per-seat subscription plus an enterprise tier with custom SLA.`,
  market:       "Mid-market B2B (100–2000 employees), legal ops and procurement teams",
  revenueModel: "SaaS — $49/seat/month, enterprise at $2k/month flat + onboarding fee",
  deadlineDays: 90,
  runwayMonths: 8,
  team: [
    { name: "Alex",  role: "backend",  level: "senior" },
    { name: "Sam",   role: "frontend", level: "mid"    },
    { name: "Jordan",role: "data",     level: "mid"    },
    { name: "Casey", role: "legal",    level: "senior" },
    { name: "Riley", role: "business", level: "senior" },
  ],
};