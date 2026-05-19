import { useEffect, useState } from "react";
import { API_BASE } from "../lib/dataApi";
import { DetailDrawer, DrawerSection, KVList } from "../components/DetailDrawer";

/* ================= TYPES ================= */

interface OperationTest {
  planId: string;
  id: string;
  name: string;
  category: string;
  status: string | null;
  currentValue: string | null;
  benchmark: string | null;
  description: string | null;
  recommendation: string | null;
  impact: string | null;
  effort: string | null;
}

interface PayrollFile {
  id: string | number;
  plan_id: string;
  received_at: string | null;
  processed_at: string | null;
  status: string | null;
  error_count: number | null;
}

interface PlanHealthResponse {
  diagnostic_tests: OperationTest[];
}

interface PayrollResponse {
  payroll_files: PayrollFile[];
}

/* ================= CONSTANTS ================= */

const PAYROLL_COLUMNS: { key: keyof PayrollFile; label: string }[] = [
  { key: "id",           label: "ID" },
  { key: "plan_id",      label: "Plan ID" },
  { key: "received_at",  label: "Received At" },
  { key: "processed_at", label: "Processed At" },
  { key: "status",       label: "Status" },
  { key: "error_count",  label: "Errors" },
];

/* ================= HELPERS ================= */

const STATUS_CFG = {
  pass: { color: "#22c55e", bg: "#f0fdf4", border: "#22c55e", label: "PASS" },
  warn: { color: "#f59e0b", bg: "#fffbeb", border: "#f59e0b", label: "WARN" },
  fail: { color: "#ef4444", bg: "#fef2f2", border: "#ef4444", label: "FAIL" },
} as const;

const getCfg = (status: string | null) => {
  const s = (status ?? "").toLowerCase() as keyof typeof STATUS_CFG;
  return STATUS_CFG[s] ?? STATUS_CFG.warn;
};

const payrollStatusStyle = (status: string | null) => {
  const s = (status ?? "").toLowerCase();
  if (s.includes("process") || s.includes("complet") || s === "success")
    return { bg: "#f0fdf4", color: "#16a34a" };
  if (s.includes("fail") || s.includes("error") || s.includes("reject"))
    return { bg: "#fef2f2", color: "#dc2626" };
  return { bg: "#fffbeb", color: "#d97706" };
};

/* ================= TEST CARD ================= */

function OperationCard({ test }: { test: OperationTest }) {
  const cfg = getCfg(test.status);

  return (
    <div
      style={{
        border: `1px solid ${cfg.border}40`,
        borderLeft: `4px solid ${cfg.border}`,
        borderRadius: "10px",
        padding: "1rem",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827" }}>{test.name}</div>
        <span
          style={{
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}40`,
            borderRadius: "6px",
            padding: "2px 8px",
            fontSize: "0.7rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Current vs Benchmark */}
      <div style={{ display: "flex", gap: "24px" }}>
        <div>
          <div style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current</div>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#111827" }}>{test.currentValue ?? "—"}</div>
        </div>
        {test.benchmark && (
          <div>
            <div style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Benchmark</div>
            <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#64748b" }}>{test.benchmark}</div>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {test.recommendation && (
        <div style={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.4 }}>{test.recommendation}</div>
      )}

      {/* Impact / Effort */}
      {(test.impact || test.effort) && (
        <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
          {test.impact && (
            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
              Impact: <strong style={{ color: "#374151" }}>{test.impact}</strong>
            </span>
          )}
          {test.effort && (
            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
              Effort: <strong style={{ color: "#374151" }}>{test.effort}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export function OperationsTests() {
  const [tests, setTests]     = useState<OperationTest[]>([]);
  const [rows, setRows]       = useState<PayrollFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [showAllAttention, setShowAllAttention] = useState(false);
  const [showAllPassing, setShowAllPassing]     = useState(false);
  const [showAllPayroll, setShowAllPayroll]     = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [detailData, setDetailData]         = useState<{ operations_tests: OperationTest[]; payroll_files: PayrollFile[] } | null>(null);
  const [detailLoading, setDetailLoading]   = useState(false);
  const [detailError, setDetailError]       = useState<string | null>(null);

  /* ===== LOAD MAIN DATA ===== */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API_BASE}/plan-health`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<PlanHealthResponse>;
      }),
      fetch(`${API_BASE}/payroll-files`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<PayrollResponse>;
      }),
    ])
      .then(([health, payroll]) => {
        if (cancelled) return;
        setTests((health.diagnostic_tests ?? []).filter((t) => t.category === "operations"));
        setRows(payroll.payroll_files ?? []);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  /* ===== LOAD PLAN DETAIL ===== */
  useEffect(() => {
    if (!selectedPlanId) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    fetch(`${API_BASE}/plans/${encodeURIComponent(selectedPlanId)}/operations`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (!cancelled) setDetailData(d); })
      .catch((e) => { if (!cancelled) setDetailError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });

    return () => { cancelled = true; };
  }, [selectedPlanId]);

  if (loading) return <div style={{ padding: "2rem" }}>Loading operations data…</div>;
  if (error)   return <div style={{ padding: "2rem", color: "#ef4444" }}>Error: {error}</div>;

  /* Derived counts */
  const pass  = tests.filter((t) => (t.status ?? "").toLowerCase() === "pass").length;
  const warn  = tests.filter((t) => (t.status ?? "").toLowerCase() === "warn").length;
  const fail  = tests.filter((t) => (t.status ?? "").toLowerCase() === "fail").length;
  const total = tests.length;
  const scorePercent  = total ? Math.round((pass / total) * 100) : 0;
  const progressColor = scorePercent >= 75 ? "#22c55e" : scorePercent >= 50 ? "#f59e0b" : "#ef4444";

  const needsAttention = tests.filter((t) => (t.status ?? "").toLowerCase() !== "pass");
  const passing        = tests.filter((t) => (t.status ?? "").toLowerCase() === "pass");

  return (
    <>
      <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* ===== HEADER ===== */}
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Operations Tests</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "4px 0 0" }}>
            Compliance, payroll processing, and enrollment diagnostics
          </p>
        </div>

        {/* ===== SUMMARY BAR ===== */}
        {total > 0 && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: "200px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1 }}>{scorePercent}%</div>
                <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Score</div>
              </div>
              <div style={{ flex: 1, height: "8px", background: "#e5e7eb", borderRadius: "4px", maxWidth: "200px" }}>
                <div
                  style={{
                    width: `${scorePercent}%`,
                    height: "100%",
                    background: progressColor,
                    borderRadius: "4px",
                    transition: "width 0.4s",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              {[
                { icon: "✓", color: "#22c55e", count: pass, label: "Pass" },
                { icon: "⚠", color: "#f59e0b", count: warn, label: "Warn" },
                { icon: "✕", color: "#ef4444", count: fail, label: "Fail" },
              ].map(({ icon, color, count, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ color, fontSize: "0.95rem" }}>{icon}</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{count} {label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== NEEDS ATTENTION ===== */}
        {needsAttention.length > 0 && (
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#f59e0b" }}>⚠</span> Needs Attention
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {(showAllAttention ? needsAttention : needsAttention.slice(0, 6)).map((t, i) => (
                <OperationCard key={`${t.planId}-${t.id}-${i}`} test={t} />
              ))}
            </div>
            {needsAttention.length > 6 && (
              <button
                onClick={() => setShowAllAttention((v) => !v)}
                style={{
                  marginTop: "10px",
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
                {showAllAttention ? "Show less" : `Show ${needsAttention.length - 6} more`}
              </button>
            )}
          </div>
        )}

        {/* ===== PASSING ===== */}
        {passing.length > 0 && (
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#22c55e" }}>✓</span> Passing
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {(showAllPassing ? passing : passing.slice(0, 6)).map((t, i) => (
                <OperationCard key={`${t.planId}-${t.id}-${i}`} test={t} />
              ))}
            </div>
            {passing.length > 6 && (
              <button
                onClick={() => setShowAllPassing((v) => !v)}
                style={{
                  marginTop: "10px",
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
                {showAllPassing ? "Show less" : `Show ${passing.length - 6} more`}
              </button>
            )}
          </div>
        )}

        {total === 0 && <div style={{ color: "#6b7280" }}>No operations tests found.</div>}

        {/* ===== PAYROLL FILE HISTORY ===== */}
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #e5e7eb",
              fontWeight: 600,
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📄 Recent Payroll Files
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: "1.5rem", color: "#6b7280" }}>No payroll files found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {PAYROLL_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          textAlign: "left",
                          padding: "10px 16px",
                          fontWeight: 600,
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(showAllPayroll ? rows : rows.slice(0, 8)).map((row, i) => (
                    <tr
                      key={row.id ?? i}
                      onClick={() => setSelectedPlanId(row.plan_id)}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      {PAYROLL_COLUMNS.map((col) => {
                        if (col.key === "status") {
                          const { bg, color } = payrollStatusStyle(row.status);
                          return (
                            <td key={col.key} style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                              {row.status ? (
                                <span style={{ background: bg, color, padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600 }}>
                                  {row.status}
                                </span>
                              ) : "—"}
                            </td>
                          );
                        }
                        return (
                          <td key={col.key} style={{ padding: "10px 16px", color: "#111827", whiteSpace: "nowrap" }}>
                            {row[col.key] ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > 8 && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9" }}>
              <button
                onClick={() => setShowAllPayroll((v) => !v)}
                style={{
                  display: "block",
                  width: "100%",
                  background: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontSize: "0.875rem",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                {showAllPayroll ? "Show less" : `Show ${rows.length - 8} more`}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ===== DRAWER ===== */}
      <DetailDrawer
        isOpen={selectedPlanId !== null}
        onClose={() => setSelectedPlanId(null)}
        title={`Operations · Plan ${selectedPlanId ?? ""}`}
        loading={detailLoading}
        error={detailError}
      >
        {detailData && (
          <>
            <DrawerSection heading="Operations Tests">
              {detailData.operations_tests
                .filter((t) => t.category === "operations")
                .map((t, i) => (
                  <div key={i} style={{ padding: "8px 0", borderTop: i > 0 ? "1px solid #f1f5f9" : undefined }}>
                    <KVList
                      items={[
                        { label: "Name",           value: t.name },
                        { label: "Status",         value: t.status },
                        { label: "Current Value",  value: t.currentValue },
                        { label: "Benchmark",      value: t.benchmark },
                        { label: "Recommendation", value: t.recommendation },
                        { label: "Impact",         value: t.impact },
                        { label: "Effort",         value: t.effort },
                      ]}
                    />
                  </div>
                ))}
            </DrawerSection>

            <DrawerSection heading={`Payroll Files (${detailData.payroll_files.length})`}>
              {detailData.payroll_files.map((f, i) => (
                <div key={String(f.id ?? i)} style={{ padding: "8px 0", borderTop: i > 0 ? "1px solid #f1f5f9" : undefined }}>
                  <KVList
                    items={[
                      { label: "ID",           value: f.id },
                      { label: "Received At",  value: f.received_at },
                      { label: "Processed At", value: f.processed_at },
                      { label: "Status",       value: f.status },
                      { label: "Error Count",  value: f.error_count },
                    ]}
                  />
                </div>
              ))}
            </DrawerSection>
          </>
        )}
      </DetailDrawer>
    </>
  );
}

