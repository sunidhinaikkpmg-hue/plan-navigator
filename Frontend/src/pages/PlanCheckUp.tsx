import { useEffect, useState } from "react";
import { API_BASE } from "../lib/dataApi";

interface CheckupItem {
  testId: string;
  name: string;
  category: string;
  resultStatus: string | null;
  value: string | number | null;
  benchmark: string | null;
  recommendation: string | null;
  recommendationTitle: string | null;
  impact: string | null;
  effort: string | null;
  aiExplanation: string | null;
}

interface CheckupResponse {
  checkup: CheckupItem[];
}

interface CheckupCard extends CheckupItem {
  planId: string;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  fail: { color: "#dc2626", label: "Action Required" },
  warn: { color: "#f59e0b", label: "Needs Attention" },
  pass: { color: "#16a34a", label: "Healthy" },
};

export function PlanCheckUp() {
  const [items, setItems] = useState<CheckupCard[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/check-up`)
      .then((res) => res.json())
      .then((data: CheckupResponse) => {
        const mapped = (data.checkup || []).map((item) => ({
          ...item,
          planId: (item as CheckupCard).planId ?? "",
        }));
        setItems(mapped);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ✅ SUMMARY CALCULATION (DYNAMIC) */
  const summary = items.reduce(
    (acc, item) => {
      const status = item.resultStatus?.toLowerCase();

      if (status === "fail") acc.fail += 1;
      else if (status === "warn") acc.warn += 1;
      else if (status === "pass") acc.pass += 1;

      return acc;
    },
    { fail: 0, warn: 0, pass: 0 }
  );

  const total = items.length || 1;
  const healthScore = Math.round((summary.pass / total) * 100);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      
      {/* ✅ TOP SUMMARY SECTION */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: 12, letterSpacing: "0.08em", color: "#6b7280" }}>
          PLAN CHECK-UP
        </p>

        <h1 style={{ fontSize: 32, fontWeight: 600 }}>
          Your plan, at a glance.
        </h1>

        <div
          style={{
            display: "flex",
            gap: "2rem",
            borderTop: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
            padding: "2rem 0",
            marginTop: "1rem",
            alignItems: "center",
          }}
        >
          {/* LEFT: HEALTH SCORE */}
          <div>
            <div style={{ fontSize: 64, fontWeight: 700 }}>
              {healthScore}
              <span style={{ fontSize: 24 }}>%</span>
            </div>
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              HEALTH SCORE
            </p>
          </div>

          {/* RIGHT: COUNTS */}
          <div>
            <p style={{ marginBottom: 10 }}>
              {summary.fail} tests are failing and {summary.warn} need attention.
              Focus on the prioritized actions below.
            </p>

            <div style={{ display: "flex", gap: 20 }}>
              <span style={{ color: "#dc2626" }}>
                ● {summary.fail} failing
              </span>
              <span style={{ color: "#f59e0b" }}>
                ● {summary.warn} to review
              </span>
              <span style={{ color: "#6b7280" }}>
                ● {summary.pass} healthy
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ PRIORITY LIST */}
      <h2 style={{ fontSize: 22, fontWeight: 600 }}>Your priority actions</h2>

      <div
        style={{
          marginTop: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {(showAll ? items : items.slice(0, 6)).map((item, index) => {
          const status =
            STATUS_META[item.resultStatus?.toLowerCase() || "fail"];

          const isOpen = expanded === item.testId;

          return (
            <div key={item.testId} style={{ borderBottom: "1px solid #e5e7eb" }}>
              
              {/* ✅ ROW */}
              <div
                onClick={() =>
                  setExpanded(isOpen ? null : item.testId)
                }
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "16px",
                  cursor: "pointer",
                }}
              >
                {/* LEFT */}
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ color: "#9ca3af", width: 30 }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: status.color,
                      marginTop: 6,
                    }}
                  />

                  <div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>
                        {item.name}
                      </span>
                      <span style={{ color: status.color, fontSize: 13 }}>
                        {status.label}
                      </span>
                    </div>

                    {/* ✅ VALUE + BENCHMARK FIX */}
                    <div style={{ color: "#6b7280", fontSize: 13 }}>
                      {typeof item.value === "number"
                        ? `${(item.value * 100).toFixed(2)}%`
                        : item.value}{" "}
                      vs benchmark {item.benchmark || "—"}
                    </div>
                  </div>
                </div>

                {/* RIGHT VALUE */}
                <div style={{ fontWeight: 600, fontSize: 18 }}>
                  {typeof item.value === "number"
                    ? `${(item.value * 100).toFixed(2)}%`
                    : item.value}
                </div>
              </div>

              {/* ✅ EXPANDED DETAILS */}
              {isOpen && (
                <div
                  style={{
                    background: "#f9fafb",
                    padding: "16px 24px",
                    fontSize: 14,
                  }}
                >
                  {item.recommendationTitle && (
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      {item.recommendationTitle}
                    </div>
                  )}

                  {item.recommendation && (
                    <p style={{ marginBottom: 10 }}>
                      {item.recommendation}
                    </p>
                  )}

                  <div style={{ color: "#6b7280", fontSize: 13 }}>
                    {item.impact && <span>Impact: {item.impact}</span>}
                    {item.impact && item.effort && <span> · </span>}
                    {item.effort && <span>Effort: {item.effort}</span>}
                  </div>

                  {item.aiExplanation && (
                    <p style={{ marginTop: 10 }}>
                      {item.aiExplanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {items.length > 6 && (
        <button
          onClick={() => setShowAll((v) => !v)}
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
          {showAll ? "Show less" : `Show ${items.length - 6} more`}
        </button>
      )}
    </div>
  );
}