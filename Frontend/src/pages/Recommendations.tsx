import { useEffect, useState } from "react";
import type React from "react";
import { API_BASE } from "../lib/dataApi";

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

export function Recommendations() {
  const [cards, setCards] = useState<RecommendationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<"all" | string>("all");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE}/recommendations`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as RecommendationResponse;
        if (cancelled) return;

        const nextCards: RecommendationCard[] = (payload.recommendations ?? []).map((rec) => ({
          ...rec,
          planId: (rec as RecommendationCard).planId ?? "",
        }));

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

  const categories = Array.from(new Set(cards.map((c) => c.category).filter(Boolean))).sort();
  const filtered = filter === "all" ? cards : cards.filter((c) => c.category === filter);
  const IMPACT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const EFFORT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const sorted = [...filtered].sort((a, b) => {
    const ia = IMPACT_RANK[(a.impact ?? "").toLowerCase()] ?? 3;
    const ib = IMPACT_RANK[(b.impact ?? "").toLowerCase()] ?? 3;
    if (ia !== ib) return ia - ib;
    const ea = EFFORT_RANK[(a.effort ?? "").toLowerCase()] ?? 3;
    const eb = EFFORT_RANK[(b.effort ?? "").toLowerCase()] ?? 3;
    return ea - eb;
  });
  const visible  = showAll ? sorted : sorted.slice(0, 6);

  const impactStyle = (impact: string) => {
    const s = (impact ?? "").toLowerCase();
    if (s === "high")   return { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" };
    if (s === "medium") return { bg: "#fffbeb", color: "#d97706", border: "#fcd34d" };
    return                     { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" };
  };

  const chipStyle = (bg: string, color: string, border: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    background: bg,
    color,
    border: `1px solid ${border}`,
    borderRadius: "999px",
    padding: "2px 10px",
    fontSize: "0.7rem",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  });

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 14px",
    fontSize: "0.8rem",
    fontWeight: 500,
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    background: active ? "#1e293b" : "#ffffff",
    color:      active ? "#ffffff" : "#374151",
    transition: "all 0.15s",
  });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* STICKY HEADER */}
      <div style={{ flexShrink: 0, padding: "2rem 2rem 1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Recommendations</h1>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "4px 0 0" }}>
          Prioritized action items ranked by impact and effort
        </p>
      </div>

      {/* SCROLLABLE BODY */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "0 2rem 2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {loading && <div style={{ color: "#6b7280" }}>Loading recommendations...</div>}

      {!loading && error && (
        <div style={{ color: "#ef4444" }}>
          <strong>Could not load recommendations.</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* FILTER BUTTONS */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>⊞ Filter:</span>
            <button style={filterBtnStyle(filter === "all")} onClick={() => { setFilter("all"); setShowAll(false); }}>All</button>
            {categories.map((cat) => (
              <button
                key={cat}
                style={filterBtnStyle(filter === cat)}
                onClick={() => { setFilter(cat); setShowAll(false); }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, " ")}
              </button>
            ))}
          </div>

          {/* LIST */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "#6b7280" }}>
              All tests passing — no recommendations at this time.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {visible.map((card, i) => {
                  const ic = impactStyle(card.impact);
                  return (
                    <div
                      key={`${card.planId}-${card.id}`}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "1.25rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        transition: "box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)")}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>

                        {/* Number badge */}
                        <div style={{
                          flexShrink: 0,
                          width: 32, height: 32,
                          borderRadius: "50%",
                          background: "#eff6ff",
                          color: "#2563eb",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {i + 1}
                        </div>

                        {/* Body */}
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontWeight: 600, fontSize: "0.9rem", margin: 0, color: "#111827" }}>
                                {card.title || "Untitled recommendation"}
                              </p>
                              <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "4px 0 0", lineHeight: 1.4 }}>
                                {card.description || "No description available."}
                              </p>
                            </div>
                            <button
                              style={{
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "5px 12px",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                background: "#ffffff",
                                color: "#374151",
                                cursor: "pointer",
                              }}
                            >
                              Request Change ↗
                            </button>
                          </div>

                          {/* Chips */}
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                            {card.impact && (
                              <span style={chipStyle(ic.bg, ic.color, ic.border)}>
                                {card.impact} impact
                              </span>
                            )}
                            {card.effort && (
                              <span style={chipStyle("#f9fafb", "#374151", "#e5e7eb")}>
                                {card.effort} effort
                              </span>
                            )}
                            {card.category && (
                              <span style={chipStyle("#f0f9ff", "#0369a1", "#bae6fd")}>
                                {card.category.replace(/-/g, " ")}
                              </span>
                            )}
                          </div>

                          {/* Potential improvement */}
                          {card.potentialImprovement && (
                            <p style={{ fontSize: "0.75rem", color: "#6b7280", fontStyle: "italic", margin: "2px 0 0" }}>
                              {card.potentialImprovement}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SHOW MORE */}
              {filtered.length > 6 && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  style={{
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
                  {showAll ? "Show less" : `Show ${filtered.length - 6} more`}
                </button>
              )}
            </>
          )}
        </>
      )}
      </div>
    </div>
  );
}
