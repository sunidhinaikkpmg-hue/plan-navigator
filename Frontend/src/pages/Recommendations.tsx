import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

interface DataSchemaSheet {
  sheet_name: string;
  rows: Array<Record<string, unknown>>;
}

interface DataSchemaResponse {
  sheets: DataSchemaSheet[];
}

interface RecommendationItem {
  id: string;
  testId: string;
  testName: string;
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  status: string;
  potentialImprovement: string;
}

interface RecommendationResponse {
  recommendations: RecommendationItem[];
}

interface RecommendationCard extends RecommendationItem {
  planId: string;
}

async function fetchPlanIds(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/data-schema?offset=0&limit=1000`);
  if (!response.ok) return [];

  const payload = (await response.json()) as DataSchemaResponse;
  const plansSheet = payload.sheets.find((sheet) => sheet.sheet_name.toLowerCase() === "plans");
  if (!plansSheet) return [];

  const ids = plansSheet.rows
    .map((row) => row.plan_id)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return Array.from(new Set(ids));
}

async function fetchPlanRecommendations(planId: string): Promise<RecommendationResponse | null> {
  const response = await fetch(`${API_BASE}/plans/${encodeURIComponent(planId)}/recommendations`);
  if (!response.ok) return null;
  return (await response.json()) as RecommendationResponse;
}

export function Recommendations() {
  const [cards, setCards] = useState<RecommendationCard[]>([]);
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

        const results = await Promise.all(planIds.map((planId) => fetchPlanRecommendations(planId)));
        if (cancelled) return;

        const nextCards: RecommendationCard[] = [];
        for (let i = 0; i < planIds.length; i += 1) {
          const payload = results[i];
          if (!payload) continue;

          for (const rec of payload.recommendations) {
            nextCards.push({
              ...rec,
              planId: planIds[i],
            });
          }
        }

        setCards(nextCards);
      } catch {
        if (!cancelled) {
          setError("Failed to load recommendations from backend API.");
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

  return (
    <section className="page-shell rec-shell">
      <div className="ph-header-row">
        <div>
          <h1>Recommendations</h1>
          <p>All recommendations from backend, shown as full-width cards.</p>
        </div>
        <span className="ph-count-chip">{cards.length} card{cards.length !== 1 ? "s" : ""}</span>
      </div>

      {loading && <div className="state-box">Loading recommendations...</div>}

      {!loading && error && (
        <div className="state-box error-box">
          <strong>Could not load recommendations.</strong>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && cards.length === 0 && (
        <div className="state-box">No recommendations available.</div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="rec-list">
          {cards.map((card) => (
            <article key={`${card.planId}-${card.id}`} className="rec-card">
              <h3>{card.title || "Untitled recommendation"}</h3>
              <p className="rec-description">{card.description || "No description available."}</p>

              <div className="rec-meta-row">
                <span>Impact: {card.impact || "-"}</span>
                <span>Effort: {card.effort || "-"}</span>
                <span>Category: {card.category || "-"}</span>
              </div>

              <div className="rec-bottom">
                <small>Potential Improvement</small>
                <p>{card.potentialImprovement || "Not available"}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
