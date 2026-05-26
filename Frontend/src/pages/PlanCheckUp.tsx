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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fail: true,
    warn: false,
    pass: false,
  });
  const [loading, setLoading] = useState(true);

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

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

  const STATUS_ORDER: Record<string, number> = { fail: 0, warn: 1, pass: 2 };
  const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const sortedItems = [...items].sort((a, b) => {
    const statusA = STATUS_ORDER[a.resultStatus?.toLowerCase() ?? ""] ?? 99;
    const statusB = STATUS_ORDER[b.resultStatus?.toLowerCase() ?? ""] ?? 99;
    if (statusA !== statusB) return statusA - statusB;
    const impactA = IMPACT_ORDER[a.impact?.toLowerCase() ?? ""] ?? 99;
    const impactB = IMPACT_ORDER[b.impact?.toLowerCase() ?? ""] ?? 99;
    return impactA - impactB;
  });

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  const SECTIONS: { key: string; label: string; items: CheckupCard[] }[] = [
    {
      key: "fail",
      label: "Action Required",
      items: sortedItems.filter((i) => i.resultStatus?.toLowerCase() === "fail"),
    },
    {
      key: "warn",
      label: "Needs Attention",
      items: sortedItems.filter((i) => i.resultStatus?.toLowerCase() === "warn"),
    },
    {
      key: "pass",
      label: "Passing",
      items: sortedItems.filter((i) => i.resultStatus?.toLowerCase() === "pass"),
    },
  ];

  const renderItems = (sectionItems: CheckupCard[]) =>
    sectionItems.map((item, index) => {
      const status = STATUS_META[item.resultStatus?.toLowerCase() || "fail"];
      const isOpen = expanded === item.testId;
      return (
        <div
          key={item.testId}
          style={{
            borderBottom: "1px solid #f3f4f6",
            background: isOpen ? "#fafafa" : "#fff",
          }}
        >
          <div
            onClick={() => setExpanded(isOpen ? null : item.testId)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ color: "#d1d5db", fontSize: 12, fontWeight: 700, minWidth: 24, textAlign: "right" }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: status.color,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{item.name}</div>
                <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                  {typeof item.value === "number"
                    ? `${(item.value * 100).toFixed(2)}%`
                    : item.value}{" "}
                  · benchmark {item.benchmark || "—"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: status.color,
                }}
              >
                {typeof item.value === "number"
                  ? `${(item.value * 100).toFixed(2)}%`
                  : item.value}
              </span>
              <span style={{ color: "#d1d5db", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
            </div>
          </div>

          {isOpen && (
            <div
              style={{
                background: "#f9fafb",
                borderTop: "1px solid #f3f4f6",
                padding: "16px 20px 16px 62px",
                fontSize: 13,
              }}
            >
              {item.recommendationTitle && (
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 6 }}>
                  {item.recommendationTitle}
                </div>
              )}
              {item.recommendation && (
                <p style={{ color: "#374151", marginBottom: 10, lineHeight: 1.6 }}>{item.recommendation}</p>
              )}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: item.aiExplanation ? 10 : 0 }}>
                {item.impact && (
                  <span style={{ fontSize: 12, background: "#f3f4f6", borderRadius: 6, padding: "3px 10px", color: "#6b7280" }}>
                    Impact: <strong style={{ color: "#374151" }}>{item.impact}</strong>
                  </span>
                )}
                {item.effort && (
                  <span style={{ fontSize: 12, background: "#f3f4f6", borderRadius: 6, padding: "3px 10px", color: "#6b7280" }}>
                    Effort: <strong style={{ color: "#374151" }}>{item.effort}</strong>
                  </span>
                )}
              </div>
              {item.aiExplanation && (
                <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6, marginTop: 8, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
                  {item.aiExplanation}
                </p>
              )}
            </div>
          )}
        </div>
      );
    });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "inherit" }}>

      {/* STICKY HEADER + SUMMARY */}
      <div style={{ flexShrink: 0, padding: "2rem 2rem 1.25rem" }}>

      {/* HEADER */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#9ca3af", fontWeight: 600, marginBottom: 6 }}>
          PLAN CHECK-UP
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#111827", margin: 0 }}>
          Your plan, at a glance.
        </h1>
      </div>

      {/* SUMMARY CARD */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: "1.5rem 2rem",
          marginBottom: "2rem",
          alignItems: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {/* SCORE */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 100,
            padding: "0.5rem 1.5rem",
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1,
              color: "#111827",
            }}
          >
            {healthScore}
            <span style={{ fontSize: 20, fontWeight: 600 }}>%</span>
          </div>
          <p style={{ fontSize: 10, letterSpacing: "0.1em", color: "#6b7280", fontWeight: 600, marginTop: 4 }}>
            HEALTH SCORE
          </p>
        </div>

        {/* DIVIDER */}
        <div style={{ width: 1, height: 60, background: "#e5e7eb" }} />

        {/* COUNTS */}
        <div style={{ flex: 1 }}>
          <p style={{ color: "#374151", fontSize: 14, marginBottom: 12, lineHeight: 1.5 }}>
            {summary.fail > 0
              ? <><strong>{summary.fail} test{summary.fail !== 1 ? "s" : ""}</strong> require action and <strong>{summary.warn}</strong> need attention.</>
              : summary.warn > 0
              ? <><strong>{summary.warn} test{summary.warn !== 1 ? "s" : ""}</strong> need attention.</>
              : <><strong>All tests passing.</strong> Your plan looks great!</>
            }
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#dc2626", background: "#fee2e2", borderRadius: 999, padding: "3px 12px", fontWeight: 600 }}>
              ● {summary.fail} failing
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#d97706", background: "#fef3c7", borderRadius: 999, padding: "3px 12px", fontWeight: 600 }}>
              ● {summary.warn} to review
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#16a34a", background: "#dcfce7", borderRadius: 999, padding: "3px 12px", fontWeight: 600 }}>
              ● {summary.pass} healthy
            </span>
          </div>
        </div>
      </div>{/* end SUMMARY CARD */}
      </div>{/* end sticky header */}

      {/* SCROLLABLE BODY */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "0 2rem 2rem" }}>

      {/* CATEGORY SECTIONS */}
      <div style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>
          Your Priority Actions
        </h2>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
          Ordered by severity and impact · start at top
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {SECTIONS.map(({ key, label, items: sectionItems }) => {
          const meta = STATUS_META[key];
          const isOpen = openSections[key];
          const bgTint = key === "fail" ? "#fef2f2" : key === "warn" ? "#fffbeb" : "#f0fdf4";
          const badgeBg = key === "fail" ? "#fee2e2" : key === "warn" ? "#fef3c7" : "#dcfce7";
          const borderAccent = key === "fail" ? "#fca5a5" : key === "warn" ? "#fcd34d" : "#86efac";

          return (
            <div
              key={key}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
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
                  borderBottom: isOpen && sectionItems.length > 0 ? `1px solid ${borderAccent}` : "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: meta.color,
                      display: "inline-block",
                      boxShadow: `0 0 0 3px ${badgeBg}`,
                    }}
                  />
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{label}</span>
                  <span
                    style={{
                      background: badgeBg,
                      color: meta.color,
                      borderRadius: 999,
                      padding: "2px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {sectionItems.length}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6b7280",
                    letterSpacing: "0.05em",
                    background: "#f3f4f6",
                    borderRadius: 6,
                    padding: "3px 10px",
                  }}
                >
                  {isOpen ? "▲ HIDE" : "▼ SHOW"}
                </span>
              </button>

              {/* ITEMS */}
              {isOpen && sectionItems.length === 0 && (
                <div style={{ padding: "16px 20px", color: "#9ca3af", fontSize: 13 }}>
                  No items in this category.
                </div>
              )}
              {isOpen && sectionItems.length > 0 && (
                <div style={{ background: "#fff" }}>
                  {renderItems(sectionItems)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>{/* end scrollable body */}
    </div>
  );
}