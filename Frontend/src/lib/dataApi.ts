export const API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api"
).replace(/\/+$/, "");

export interface Plan {
  plan_id: string;
  name: string | null;
  plan_type: string | null;
}

export async function fetchPlans(): Promise<Plan[]> {
  const response = await fetch(`${API_BASE}/plans`);
  if (!response.ok) return [];
  const payload = (await response.json()) as { plans: Plan[] };
  return payload.plans ?? [];
}

export async function fetchPlanIds(): Promise<string[]> {
  const plans = await fetchPlans();
  return plans.map((p) => p.plan_id).filter(Boolean);
}
