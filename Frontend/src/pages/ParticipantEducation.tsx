import { useEffect, useState } from "react";
import { API_BASE } from "../lib/dataApi";

interface CampaignRow {
  id: string | number;
  plan_id: string;
  name: string | null;
  type: string | null;
  topic: string | null;
  target_audience: string | null;
  date_launched: string | null;
  date_ended: string | null;
  participants_reached: number | null;
  engagement_rate: number | null;
  status: string | null;
}

interface CampaignResponse {
  campaigns: CampaignRow[];
}

const COLUMNS: { key: keyof CampaignRow; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "topic", label: "Topic" },
  { key: "target_audience", label: "Target Audience" },
  { key: "date_launched", label: "Date Launched" },
  { key: "participants_reached", label: "Participants Reached" },
  { key: "engagement_rate", label: "Engagement Rate" },
  { key: "status", label: "Status" },
];

export function ParticipantEducation() {
  const [planCount, setPlanCount] = useState(0);
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/campaigns`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as CampaignResponse;

        if (cancelled) return;

        const campaigns = payload.campaigns ?? [];
        const uniquePlans = new Set(campaigns.map((c) => c.plan_id).filter(Boolean));
        setPlanCount(uniquePlans.size);
        setRows(campaigns);
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to load campaigns.";
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
      <div style={{ padding: "2rem", color: "#6b7280" }}>Loading participant education campaigns...</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "#ef4444" }}>Error: {error}</div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* STICKY HEADER */}
      <div style={{ flexShrink: 0, padding: "2rem 2rem 1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Participant Education Campaigns
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: 0 }}>
          Plans scanned: <strong>{planCount}</strong> - {rows.length} record{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* SCROLLABLE BODY */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "0 2rem 2rem" }}>

      {rows.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No campaigns found.</p>
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
              {(showAll ? rows : rows.slice(0, 8)).map((row, i) => (
                <tr
                  key={`${row.plan_id}-${row.id ?? i}`}
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
                      {row[col.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 8 && (
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
          {showAll ? "Show less" : `Show ${rows.length - 8} more`}
        </button>
      )}
      </div>{/* end scrollable body */}
    </div>
  );
}
