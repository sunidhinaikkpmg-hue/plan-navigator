import { useEffect, useState } from "react";
import { API_BASE } from "../lib/dataApi";
import { DetailDrawer, DrawerSection, KVList } from "../components/DetailDrawer";

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

const CARD_LIMIT = 6;

export function PlanHealthTests() {
  const [cards, setCards] = useState<CardViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllCards, setShowAllCards] = useState(false);

  // Detail drawer state
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<PlanHealthResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE}/plan-health`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as PlanHealthResponse;
        if (cancelled) return;

        const recommendationByPlanTest = new Map<string, { description: string; status?: string }>();
        for (const rec of payload.recommendations) {
          const key = `${(rec as PlanRecommendation & { planId?: string }).planId ?? ""}-${rec.testId}`;
          const existing = recommendationByPlanTest.get(key);
          if (!existing || recommendationPriority(rec.status) > recommendationPriority(existing.status)) {
            recommendationByPlanTest.set(key, { description: rec.description, status: rec.status });
          }
        }

        const nextCards: CardViewModel[] = [];
        const seen = new Set<string>();
        for (const test of payload.diagnostic_tests) {
          const planId = (test as PlanHealthTest & { planId?: string }).planId ?? "";
          const dedup = `${planId}-${test.id}`;
          if (seen.has(dedup)) continue;
          seen.add(dedup);
          const recKey = `${planId}-${test.id}`;
          nextCards.push({
            planId,
            testId: test.id,
            name: test.name,
            status: test.status,
            benchmark: test.benchmark ?? "-",
            recommendationDescription:
              recommendationByPlanTest.get(recKey)?.description || test.recommendation || "No recommendation description available.",
            impact: test.impact ?? "-",
            effort: test.effort ?? "-",
          });
        }

        setCards(nextCards);
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

  // Fetch per-plan detail when a plan is selected
  useEffect(() => {
    if (!selectedPlanId) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    fetch(`${API_BASE}/plans/${encodeURIComponent(selectedPlanId)}/plan-health`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<PlanHealthResponse>;
      })
      .then((data) => { if (!cancelled) setDetailData(data); })
      .catch((e) => { if (!cancelled) setDetailError(e instanceof Error ? e.message : "Failed to load."); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });

    return () => { cancelled = true; };
  }, [selectedPlanId]);

  const cardCountLabel = `${cards.length} card${cards.length !== 1 ? "s" : ""}`;

  return (
    <>
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

      {!loading && !error && cards.length > 0 && (() => {
        const pass = cards.filter(c => c.status === "pass").length;
        const warn = cards.filter(c => c.status === "warn").length;
        const fail = cards.filter(c => c.status === "fail").length;
        const total = pass + warn + fail;
        const score = total ? Math.round((pass / total) * 100) : 0;
        const passAngle = total ? (pass / total) * 360 : 0;
        const warnAngle = total ? (warn / total) * 360 : 0;
        const conic = `conic-gradient(#22c55e 0deg ${passAngle}deg, #f59e0b ${passAngle}deg ${passAngle + warnAngle}deg, #ef4444 ${passAngle + warnAngle}deg 360deg)`;

        return (
          <>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              padding: "20px",
              background: "#f8fafc",
              borderRadius: "16px"
            }}>
              <div style={{
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                background: conic,
                position: "relative",
                flexShrink: 0
              }}>
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "#ffffff"
                }} />
              </div>

              <div style={{ textAlign: "right" }}>
                <h1 style={{ margin: 0 }}>{score}%</h1>
                <p style={{ margin: 0, color: "#64748b" }}>Overall Score</p>
                <div style={{ marginTop: "12px", display: "flex", gap: "16px", justifyContent: "flex-end" }}>
                  <span>✅ {pass} Pass</span>
                  <span>⚠️ {warn} Warn</span>
                  <span>❌ {fail} Fail</span>
                </div>
              </div>
            </div>

            <div className="ph-grid">
          {(showAllCards ? cards : cards.slice(0, CARD_LIMIT)).map((card) => (
            <article
              key={`${card.planId}-${card.testId}`}
              className="ph-card"
              onClick={() => setSelectedPlanId(card.planId)}
              style={{ cursor: "pointer" }}
            >
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

            {cards.length > CARD_LIMIT && (
              <button
                onClick={() => setShowAllCards((v) => !v)}
                style={{
                  marginTop: "12px",
                  display: "block",
                  background: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontSize: "0.875rem",
                  color: "#475569",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                {showAllCards ? "Show less" : `Show ${cards.length - CARD_LIMIT} more`}
              </button>
            )}
          </>
        );
      })()}
    </section>

    <DetailDrawer
      isOpen={selectedPlanId !== null}
      onClose={() => setSelectedPlanId(null)}
      title={`Plan Health · Plan ${selectedPlanId ?? ""}`}
      loading={detailLoading}
      error={detailError}
    >
      {detailData && (
        <>
 {detailData?.diagnostic_tests.map((test) => (
  <div key={test.id} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
    
    {/* DESCRIPTION */}
    <p style={{ fontSize: "13px", color: "#475569" }}>
      {test.recommendation || "No description available."}
    </p>

    {/* CURRENT vs BENCHMARK */}
    <div style={{ display: "flex", gap: "40px" }}>
      <div>
        <small style={{ color: "#64748b" }}>Current</small>
        <h2 style={{ margin: "4px 0" }}>{test.currentValue || "-"}</h2>
      </div>

      <div>
        <small style={{ color: "#64748b" }}>Benchmark</small>
        <h2 style={{ margin: "4px 0" }}>{test.benchmark || "-"}</h2>
      </div>
    </div>

    {/* PEER BENCHMARK */}
    <div
      style={{
        background: "#f1f5f9",
        padding: "12px",
        borderRadius: "10px",
      }}
    >
      <strong style={{ fontSize: "12px" }}>PEER BENCHMARK</strong>

      <div style={{ marginTop: "8px" }}>
        <div
          style={{
            height: "6px",
            background: "#e5e7eb",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              width: "30%", // you can later map percentile here
              height: "100%",
              background: "linear-gradient(to right, red, orange, green)",
            }}
          />
        </div>
      </div>
    </div>

    {/* DETAILS */}
    <div
      style={{
        background: "#f1f5f9",
        padding: "12px",
        borderRadius: "10px",
      }}
    >
      <strong style={{ fontSize: "12px" }}>DETAILS</strong>

      <div style={{ marginTop: "6px", fontSize: "13px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Category</span>
          <span>{test.category}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Status</span>
          <span>{test.status.toUpperCase()}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Impact</span>
          <span>{test.impact}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Effort</span>
          <span>{test.effort}</span>
        </div>
      </div>
    </div>

    {/* RECOMMENDATION */}
    <div
      style={{
        background: "#e2f4fe",
        padding: "12px",
        borderRadius: "10px",
      }}
    >
      <strong style={{ fontSize: "12px" }}>RECOMMENDATION</strong>

      <p style={{ fontSize: "13px", marginTop: "4px" }}>
        {test.recommendation || "No recommendation available"}
      </p>

      <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
        <span
          style={{
            background: "#4dbffc",
            padding: "2px 8px",
            borderRadius: "999px",
            fontSize: "11px",
          }}
        >
          {test.impact} impact
        </span>

        <span
          style={{
            background: "#e5e7eb",
            padding: "2px 8px",
            borderRadius: "999px",
            fontSize: "11px",
          }}
        >
          {test.effort} effort
        </span>
      </div>
    </div>
  </div>
))}


         
        </>
      )}
    </DetailDrawer>
  </>
  );
}