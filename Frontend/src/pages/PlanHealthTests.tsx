import { useEffect, useState } from "react";

type TestStatus = "pass" | "warn" | "fail";

interface PlanHealthTest {
  id: string;
  name: string;
  category: string;
  status: TestStatus;
  currentValue: string | null;
  benchmark: string | null;
  description: string | null;
  recommendation: string | null;
  impact: string | null;
  effort: string | null;
}

interface PlanRecommendation {
  id: string;
  testId: string;
  description: string;
  status?: string;
}

interface PlanHealthResponse {
  diagnostic_tests: PlanHealthTest[];
  recommendations: PlanRecommendation[];
}

interface DataSchemaSheet {
  sheet_name: string;
  rows: Array<Record<string, unknown>>;
}

interface DataSchemaResponse {
  sheets: DataSchemaSheet[];
}

interface CardViewModel {
  planId: string;
  testId: string;
  name: string;
  status: TestStatus;
  benchmark: string;
  recommendationDescription: string;
  impact: string;
  effort: string;
}

const apiBaseUrl = "http://127.0.0.1:8000/api";

function statusClass(status: TestStatus) {
  if (status === "fail") return "ph-status danger";
  if (status === "warn") return "ph-status warn";
  return "ph-status success";
}

function statusLabel(status: TestStatus) {
  return status.toUpperCase();
}

function recommendationPriority(status: string | undefined): number {
  const normalized = (status || "").toLowerCase();
  if (normalized === "in-progress") return 3;
  if (normalized === "open") return 2;
  if (normalized === "pending") return 1;
  if (normalized === "dismissed") return 0;
  return 1;
}

async function fetchPlanIds(): Promise<string[]> {
  const response = await fetch(`${apiBaseUrl}/data-schema?offset=0&limit=100`);
  if (!response.ok) return [];

  const payload = (await response.json()) as DataSchemaResponse;
  const plansSheet = payload.sheets.find((sheet) => sheet.sheet_name.toLowerCase() === "plans");
  if (!plansSheet) return [];

  const ids = plansSheet.rows
    .map((row) => row.plan_id)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return Array.from(new Set(ids));
}

async function fetchPlanHealth(planId: string): Promise<PlanHealthResponse | null> {
  const response = await fetch(`${apiBaseUrl}/plans/${encodeURIComponent(planId)}/health-tests`);
  if (!response.ok) return null;
  return (await response.json()) as PlanHealthResponse;
}

export function PlanHealthTests() {
  const [cards, setCards] = useState<CardViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const planIds = await fetchPlanIds();
        if (planIds.length === 0) {
          if (!cancelled) setCards([]);
          return;
        }

        const results = await Promise.all(planIds.map((planId) => fetchPlanHealth(planId)));
        if (cancelled) return;

        const nextCards: CardViewModel[] = [];

        for (let i = 0; i < planIds.length; i += 1) {
          const planId = planIds[i];
          const payload = results[i];
          if (!payload) continue;

          const recommendationByTestId = new Map<string, { description: string; status?: string }>();
          for (const rec of payload.recommendations) {
            if (rec.testId && rec.description) {
              const existing = recommendationByTestId.get(rec.testId);
              if (!existing || recommendationPriority(rec.status) > recommendationPriority(existing.status)) {
                recommendationByTestId.set(rec.testId, { description: rec.description, status: rec.status });
              }
            }
          }

          for (const test of payload.diagnostic_tests) {
            nextCards.push({
              planId,
              testId: test.id,
              name: test.name,
              status: test.status,
              benchmark: test.benchmark ?? "-",
              recommendationDescription:
                recommendationByTestId.get(test.id)?.description || test.recommendation || "No recommendation description available.",
              impact: test.impact ?? "-",
              effort: test.effort ?? "-",
            });
          }
        }

        const uniqueCards = new Map<string, CardViewModel>();
        for (const card of nextCards) {
          uniqueCards.set(`${card.planId}-${card.testId}`, card);
        }

        setCards(Array.from(uniqueCards.values()));
      } catch {
        if (!cancelled) {
          setError("Failed to load plan-health cards from backend API.");
          setCards([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const cardCountLabel = `${cards.length} card${cards.length !== 1 ? "s" : ""}`;

  return (
    <section className="page-shell ph-shell">
      <div className="ph-header-row">
        <div>
          <h1>Plan Health Cards</h1>
          <p>All plan IDs from backend with plan-health diagnostic cards.</p>
        </div>
        <span className="ph-count-chip">{cardCountLabel}</span>
      </div>

      {loading && <div className="state-box">Loading plan-health cards...</div>}

      {!loading && error && (
        <div className="state-box error-box">
          <strong>Could not load plan-health cards.</strong>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && cards.length === 0 && (
        <div className="state-box">No plan-health cards available.</div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="ph-grid">
          {cards.map((card) => (
            <article key={`${card.planId}-${card.testId}`} className="ph-card">
              <div className="ph-card-top">
                <div>
                  <h3>{card.name}</h3>
                  <p className="ph-plan-id">Plan ID: {card.planId}</p>
                </div>
                <span className={statusClass(card.status)}>{statusLabel(card.status)}</span>
              </div>

              <div className="ph-benchmark">
                <small>Benchmark</small>
                <p>{card.benchmark}</p>
              </div>

              <div className="ph-recommendation">
                <small>Recommendation Description</small>
                <p>{card.recommendationDescription}</p>
              </div>

              <div className="ph-footer">
                <span>Impact: {card.impact}</span>
                <span>Effort: {card.effort}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
