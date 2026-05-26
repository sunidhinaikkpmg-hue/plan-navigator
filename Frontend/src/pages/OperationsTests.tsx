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
  const s = (test.status ?? "").toLowerCase();
  const percentile = s === "fail" ? 18 : s === "warn" ? 45 : 75;
  const pctlLabel  = s === "fail" ? "18th pctl" : s === "warn" ? "45th pctl" : "75th pctl";

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

      {/* Progress Bar */}
      <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", marginTop: 2 }}>
        <span style={{ float: "left" }}>vs peers</span>
        <span style={{ float: "right" }}>{pctlLabel}</span>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, marginTop: 6, clear: "both" }}>
          <div
            style={{
              width: `${percentile}%`,
              height: "100%",
              borderRadius: 4,
              background: "linear-gradient(to right, #ef4444, #f59e0b, #22c55e)",
              transition: "width 0.4s ease",
            }}
          />
        </div>
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

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fail: true,
    warn: true,
    pass: false,
  });
  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
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

  const failTests = tests.filter((t) => (t.status ?? "").toLowerCase() === "fail");
  const warnTests = tests.filter((t) => (t.status ?? "").toLowerCase() === "warn");
  const passTests = tests.filter((t) => (t.status ?? "").toLowerCase() === "pass");

  return (
    <>
      <div style={{ height: "110vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* STICKY HEADER + SUMMARY */}
        <div style={{ flexShrink: 0, padding: "2rem 2rem 1rem" }}>

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
        </div>{/* end sticky header */}

        {/* SCROLLABLE BODY */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "0 2rem 2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* ===== COLLAPSIBLE SECTIONS ===== */}
        {total > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {([
              { key: "fail", label: "Action Required", bgTint: "#fef2f2", badgeBg: "#fee2e2", borderAccent: "#fca5a5", dotColor: "#dc2626", sectionTests: failTests },
              { key: "warn", label: "Needs Attention",  bgTint: "#fffbeb", badgeBg: "#fef3c7", borderAccent: "#fcd34d", dotColor: "#f59e0b", sectionTests: warnTests },
              { key: "pass", label: "Passing",          bgTint: "#f0fdf4", badgeBg: "#dcfce7", borderAccent: "#86efac", dotColor: "#16a34a", sectionTests: passTests },
            ]).map(({ key, label, bgTint, badgeBg, borderAccent, dotColor, sectionTests }) => {
              const isOpen = openSections[key];
              return (
                <div
                  key={key}
                  style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                >
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
                      borderBottom: isOpen && sectionTests.length > 0 ? `1px solid ${borderAccent}` : "none",
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
                        {sectionTests.length}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.05em", background: "#f3f4f6", borderRadius: 6, padding: "3px 10px" }}>
                      {isOpen ? "▲ HIDE" : "▼ SHOW"}
                    </span>
                  </button>

                  {isOpen && sectionTests.length === 0 && (
                    <div style={{ padding: "16px 20px", color: "#9ca3af", fontSize: 13 }}>No items in this category.</div>
                  )}
                  {isOpen && sectionTests.length > 0 && (
                    <div style={{ padding: "16px 20px", background: "#fff" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                        {sectionTests.map((t, i) => (
                          <OperationCard key={`${t.planId}-${t.id}-${i}`} test={t} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "340px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", position: "sticky", top: 0, zIndex: 1 }}>
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
                  {rows.map((row, i) => (
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

        </div>

        </div>{/* end scrollable body */}
      </div>{/* end outer wrapper */}

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

