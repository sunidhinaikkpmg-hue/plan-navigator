import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

interface PayrollFile {
  id: string | number;
  plan_id: string;
  received_at: string | null;
  processed_at: string | null;
  status: string | null;
  error_count: number | null;
}

interface OperationsResponse {
  operations_tests: unknown[];
  payroll_files: PayrollFile[];
}

interface DataSchemaSheet {
  sheet_name: string;
  rows: Array<Record<string, unknown>>;
}

interface DataSchemaResponse {
  sheets: DataSchemaSheet[];
}

const COLUMNS: { key: keyof PayrollFile; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "plan_id", label: "Plan ID" },
  { key: "received_at", label: "Received At" },
  { key: "processed_at", label: "Processed At" },
  { key: "status", label: "Status" },
  { key: "error_count", label: "Error Count" },
];

export function OperationsTests() {
  const [planCount, setPlanCount] = useState(0);
  const [rows, setRows] = useState<PayrollFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all plan IDs, fetch operations for each plan, and aggregate payroll rows.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const schemaResponse = await fetch(`${API_BASE}/data-schema?offset=0&limit=1000`);
        if (!schemaResponse.ok) {
          throw new Error(`Failed to load plans (HTTP ${schemaResponse.status})`);
        }

        const schema = (await schemaResponse.json()) as DataSchemaResponse;
        const plansSheet = schema.sheets.find((sheet) => sheet.sheet_name.toLowerCase() === "plans");
        const planIds = Array.from(
          new Set(
            (plansSheet?.rows ?? [])
              .map((row) => row.plan_id)
              .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          )
        );

        if (!cancelled) {
          setPlanCount(planIds.length);
        }

        const payloads = await Promise.all(
          planIds.map(async (planId) => {
            const response = await fetch(`${API_BASE}/plans/${encodeURIComponent(planId)}/operations`);
            if (!response.ok) {
              return null;
            }
            return (await response.json()) as OperationsResponse;
          })
        );

        if (cancelled) return;

        const mergedRows = payloads.flatMap((payload) => payload?.payroll_files ?? []);
        setRows(mergedRows);
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to load payroll files.";
          setError(message);
          setRows([]);
          setPlanCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "#6b7280" }}>Loading payroll files…</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "#ef4444" }}>Error: {error}</div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Payroll Files
      </h2>
      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.25rem" }}>
        Plans scanned: <strong>{planCount}</strong> — {rows.length} record{rows.length !== 1 ? "s" : ""}
      </p>

      {rows.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No payroll files found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      textAlign: "left",
                      padding: "0.625rem 0.75rem",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "2px solid #e5e7eb",
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
                  style={{
                    background: i % 2 === 0 ? "#ffffff" : "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "0.625rem 0.75rem",
                        color: "#111827",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
