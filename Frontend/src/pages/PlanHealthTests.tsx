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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fail: true,
    warn: true,
    pass: false,
  });
  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

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
    <style>{`
      .ph-card-new {
        display: flex;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .ph-card-new:hover {
        transform: translateY(-3px);
      }
      .ph-accent {
        width: 6px;
        flex-shrink: 0;
      }
      .ph-accent.fail  { background: #ef4444; }
      .ph-accent.warn  { background: #f59e0b; }
      .ph-accent.pass  { background: #22c55e; }
      .ph-content {
        padding: 16px 18px;
        flex: 1;
        min-width: 0;
      }
      .ph-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      .ph-card-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
      }
      .ph-badge {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid transparent;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .ph-badge.fail {
        background: #fee2e2;
        color: #dc2626;
        border-color: #fecaca;
      }
      .ph-badge.warn {
        background: #fff7ed;
        color: #d97706;
        border-color: #fed7aa;
      }
      .ph-badge.pass {
        background: #ecfdf5;
        color: #16a34a;
        border-color: #bbf7d0;
      }
      .ph-metric {
        margin-top: 10px;
        display: flex;
        align-items: baseline;
        gap: 12px;
      }
      .ph-value {
        font-size: 26px;
        font-weight: 700;
        line-height: 1;
      }
      .ph-benchmark-inline {
        font-size: 13px;
        color: #64748b;
      }
      .ph-progress {
        margin-top: 10px;
        font-size: 12px;
        color: #64748b;
        overflow: hidden;
      }
      .ph-peer-label { float: left; }
      .ph-percentile  { float: right; }
      .ph-bar {
        height: 6px;
        background: #e5e7eb;
        border-radius: 4px;
        margin-top: 6px;
        clear: both;
      }
      .ph-bar-fill {
        height: 100%;
        border-radius: 4px;
        background: linear-gradient(to right, #ef4444, #f59e0b, #22c55e);
        transition: width 0.4s ease;
      }
      .ph-desc {
        margin-top: 12px;
        font-size: 13px;
        color: #334155;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .ph-footer-new {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
      }
      .pill {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 999px;
      }
      .pill.impact {
        background: #fff7ed;
        color: #d97706;
      }
      .pill.effort {
        background: #f1f5f9;
        color: #334155;
      }
      .arrow {
        margin-left: auto;
        font-size: 18px;
        color: #64748b;
      }
      .ph-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
    `}</style>
    <section className="page-shell ph-shell" style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="ph-header-row" style={{ flexShrink: 0 }}>
        <div>
          <h1>Plan Health Cards</h1>
          <p>All plan IDs from backend with plan-health diagnostic cards.</p>
        </div>
        <span className="ph-count-chip">{cardCountLabel}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "1.5rem" }}>
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

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {([
                { key: "fail", label: "Action Required", bgTint: "#fef2f2", badgeBg: "#fee2e2", borderAccent: "#fca5a5", dotColor: "#dc2626" },
                { key: "warn", label: "Needs Attention",  bgTint: "#fffbeb", badgeBg: "#fef3c7", borderAccent: "#fcd34d", dotColor: "#f59e0b" },
                { key: "pass", label: "Passing",          bgTint: "#f0fdf4", badgeBg: "#dcfce7", borderAccent: "#86efac", dotColor: "#16a34a" },
              ] as { key: TestStatus; label: string; bgTint: string; badgeBg: string; borderAccent: string; dotColor: string }[]).map(
                ({ key, label, bgTint, badgeBg, borderAccent, dotColor }) => {
                  const sectionCards = cards.filter((c) => c.status === key);
                  const isOpen = openSections[key];
                  return (
                    <div
                      key={key}
                      style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                    >
                      {/* SECTION HEADER */}
                      <button
                        onClick={() => toggleSection(key)}
                        style={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px 20px",
                          background: isOpen ? bgTint : "#fff",
                          border: "none",
                          borderBottom: isOpen && sectionCards.length > 0 ? `1px solid ${borderAccent}` : "none",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              width: 10, height: 10, borderRadius: "50%",
                              background: dotColor, display: "inline-block",
                              boxShadow: `0 0 0 3px ${badgeBg}`,
                            }}
                          />
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{label}</span>
                          <span style={{ background: badgeBg, color: dotColor, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                            {sectionCards.length}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.05em", background: "#f3f4f6", borderRadius: 6, padding: "3px 10px" }}>
                          {isOpen ? "▲ HIDE" : "▼ SHOW"}
                        </span>
                      </button>

                      {/* EMPTY STATE */}
                      {isOpen && sectionCards.length === 0 && (
                        <div style={{ padding: "16px 20px", color: "#9ca3af", fontSize: 13 }}>No items in this category.</div>
                      )}

                      {/* CARDS GRID */}
                      {isOpen && sectionCards.length > 0 && (
                        <div style={{ padding: "16px 20px", background: "#fff" }}>
                          <div className="ph-grid">
                            {sectionCards.map((card) => {
                              const percentile = card.status === "fail" ? 18 : card.status === "warn" ? 45 : 75;
                              const pctlLabel = card.status === "fail" ? "18th pctl" : card.status === "warn" ? "45th pctl" : "75th pctl";
                              return (
                                <article
                                  key={`${card.planId}-${card.testId}`}
                                  className="ph-card-new"
                                  onClick={() => setSelectedPlanId(card.planId)}
                                >
                                  <div className={`ph-accent ${card.status}`} />
                                  <div className="ph-content">
                                    <div className="ph-card-header">
                                      <h3>{card.name}</h3>
                                      <span className={`ph-badge ${card.status}`}>
                                        {card.status === "fail" ? "Action Required" : statusLabel(card.status)}
                                      </span>
                                    </div>
                                    <div className="ph-metric">
                                      <span className="ph-value">{card.benchmark !== "-" ? card.benchmark : "-"}</span>
                                      <span className="ph-benchmark-inline">Benchmark: {card.benchmark}</span>
                                    </div>
                                    <div className="ph-progress">
                                      <span className="ph-peer-label">vs peers</span>
                                      <span className="ph-percentile">{pctlLabel}</span>
                                      <div className="ph-bar">
                                        <div className="ph-bar-fill" style={{ width: `${percentile}%` }} />
                                      </div>
                                    </div>
                                    <p className="ph-desc">{card.recommendationDescription}</p>
                                    <div className="ph-footer-new">
                                      <span className="pill impact">{card.impact} impact</span>
                                      <span className="pill effort">{card.effort} effort</span>
                                      <span className="arrow">›</span>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </>
        );
      })()}
      </div>
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