import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

interface DataSchemaSheet {
  sheet_name: string;
  rows: Array<Record<string, unknown>>;
}

interface DataSchemaResponse {
  sheets: DataSchemaSheet[];
}

interface DocumentRow {
  id: string | number;
  planId: string;
  name: string | null;
  type: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
  planYear: string | number | null;
}

interface DocumentsResponse {
  documents: DocumentRow[];
}

const COLUMNS: { key: keyof DocumentRow; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "planYear", label: "Plan Year" },
  { key: "uploadedAt", label: "Uploaded At" },
  { key: "fileUrl", label: "File URL" },
];

export function Documents() {
  const [planCount, setPlanCount] = useState(0);
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const typeOptions = useMemo(() => {
    const types = rows
      .map((row) => row.type)
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0);
    return Array.from(new Set(types)).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const name = (row.name ?? "").trim().toLowerCase();
      const type = (row.type ?? "").toLowerCase();

      const matchesQuery = !q || name.startsWith(q);
      const matchesType = !typeFilter || type === typeFilter.toLowerCase();
      return matchesQuery && matchesType;
    });
  }, [query, typeFilter, rows]);

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

        if (!cancelled) setPlanCount(planIds.length);

        const payloads = await Promise.all(
          planIds.map(async (planId) => {
            const response = await fetch(`${API_BASE}/plans/${encodeURIComponent(planId)}/documents`);
            if (!response.ok) return null;
            return (await response.json()) as DocumentsResponse;
          })
        );

        if (cancelled) return;

        const mergedRows = payloads.flatMap((payload) => payload?.documents ?? []);
        setRows(mergedRows);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load documents.");
          setRows([]);
          setPlanCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem", color: "#6b7280" }}>Loading documents...</div>;
  }

  if (error) {
    return <div style={{ padding: "2rem", color: "#ef4444" }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Documents
      </h2>
      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.25rem" }}>
        Plans scanned: <strong>{planCount}</strong> — {filteredRows.length} of {rows.length} record{rows.length !== 1 ? "s" : ""}
      </p>

      {/* Search bar + type filter */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <input
          type="text"
          placeholder="Search documents by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: "1 1 280px",
            maxWidth: "480px",
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            outline: "none",
            background: "#ffffff",
            color: "#111827",
            boxSizing: "border-box",
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            outline: "none",
            background: "#ffffff",
            color: typeFilter ? "#111827" : "#6b7280",
            cursor: "pointer",
          }}
        >
          <option value="">All types</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setTypeFilter("");
          }}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#ffffff",
            color: "#111827",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No documents found.</p>
      ) : filteredRows.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No documents match "{query}".</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
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
              {filteredRows.map((row, i) => (
                <tr
                  key={`${row.planId}-${row.id ?? i}`}
                  style={{
                    background: i % 2 === 0 ? "#ffffff" : "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      style={{ padding: "0.625rem 0.75rem", color: "#111827", whiteSpace: "nowrap" }}
                    >
                      {col.key === "fileUrl" && row.fileUrl ? (
                        <a href={row.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                          View
                        </a>
                      ) : (
                        row[col.key] ?? "—"
                      )}
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
