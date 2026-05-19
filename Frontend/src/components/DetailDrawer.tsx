import { ReactNode, useEffect, useRef, useState } from "react";

// ─── Animation keyframe injected once ──────────────────────────────────────
const STYLE_ID = "detail-drawer-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes dd-skeleton-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
    .dd-skeleton { animation: dd-skeleton-pulse 1.4s ease-in-out infinite; }
    .dd-close-btn:hover { background: #f3f4f6 !important; color: #111827 !important; }
    .dd-item-card:hover { background: #f9fafb !important; }
    .dd-backdrop { backdrop-filter: blur(2px); }
  `;
  document.head.appendChild(s);
}

// ─── Status badge helper ────────────────────────────────────────────────────
const STATUS_KEYS = new Set(["status", "resultstatus", "result_status", "state"]);

function statusStyle(val: string): { color: string; bg: string } | null {
  const v = val.toLowerCase().trim();
  if (["pass", "active", "completed", "success", "approved"].includes(v))
    return { color: "#16a34a", bg: "#dcfce7" };
  if (["warn", "warning", "pending", "in-progress", "review", "medium"].includes(v))
    return { color: "#d97706", bg: "#fef3c7" };
  if (["fail", "failed", "error", "critical", "overdue", "high"].includes(v))
    return { color: "#dc2626", bg: "#fee2e2" };
  if (["open", "new", "low"].includes(v))
    return { color: "#2563eb", bg: "#dbeafe" };
  if (["dismissed", "closed", "resolved"].includes(v))
    return { color: "#6b7280", bg: "#f3f4f6" };
  return null;
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  loading: boolean;
  error: string | null;
  children: ReactNode;
}

// ─── Skeleton loader ────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ padding: "0.25rem 0" }}>
      {[100, 75, 88, 60].map((w) => (
        <div
          key={w}
          className="dd-skeleton"
          style={{
            height: "14px",
            borderRadius: "6px",
            background: "#e5e7eb",
            marginBottom: "12px",
            width: `${w}%`,
          }}
        />
      ))}
      <div style={{ height: "1px", background: "#f3f4f6", margin: "1rem 0" }} />
      {[90, 65, 80].map((w) => (
        <div
          key={w}
          className="dd-skeleton"
          style={{
            height: "14px",
            borderRadius: "6px",
            background: "#e5e7eb",
            marginBottom: "12px",
            width: `${w}%`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function DetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  loading,
  error,
  children,
}: DetailDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Slide-in: delay one frame so the transition fires
  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Focus close button when opened
  useEffect(() => {
    if (mounted) firstFocusRef.current?.focus();
  }, [mounted]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Parse subtitle from title if not provided (e.g. "Check-Up · Plan ABC123")
  const [mainTitle, planBadge] = subtitle
    ? [title, subtitle]
    : title.includes(" · ")
    ? title.split(" · ").map((s) => s.trim())
    : [title, undefined];

  return (
    <>
      {/* Backdrop */}
      <div
        className="dd-backdrop"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.45)",
          zIndex: 1000,
          transition: "opacity 0.25s",
          opacity: mounted ? 1 : 0,
        }}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mainTitle}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          width: "min(560px, 94vw)",
          background: "#ffffff",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transform: mounted ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          borderLeft: "1px solid #e5e7eb",
        }}
      >
        {/* Accent top bar */}
        <div style={{ height: "4px", background: "linear-gradient(90deg,#3b82f6,#6366f1)", flexShrink: 0 }} />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "1rem 1.25rem 0.875rem",
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
            background: "#ffffff",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
              {mainTitle}
            </h2>
            {planBadge && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: "0.3rem",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#3b82f6",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  padding: "1px 8px",
                  borderRadius: "999px",
                  letterSpacing: "0.02em",
                }}
              >
                {planBadge}
              </span>
            )}
          </div>
          <button
            ref={firstFocusRef}
            onClick={onClose}
            aria-label="Close"
            className="dd-close-btn"
            style={{
              border: "1px solid #e5e7eb",
              background: "transparent",
              color: "#6b7280",
              cursor: "pointer",
              padding: "0.3rem 0.55rem",
              borderRadius: "6px",
              fontSize: "0.9rem",
              lineHeight: 1,
              transition: "background 0.15s, color 0.15s",
              flexShrink: 0,
              marginLeft: "0.75rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Hint bar */}
        <div
          style={{
            padding: "0.35rem 1.25rem",
            background: "#f8fafc",
            borderBottom: "1px solid #f0f0f0",
            fontSize: "0.7rem",
            color: "#94a3b8",
            flexShrink: 0,
          }}
        >
          Press <kbd style={{ background: "#e2e8f0", padding: "0 4px", borderRadius: "3px", fontFamily: "monospace" }}>Esc</kbd> to close
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.25rem",
            background: "#f8fafc",
          }}
        >
          {loading && <Skeleton />}

          {!loading && error && (
            <div
              style={{
                background: "#fff5f5",
                border: "1px solid #fca5a5",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                color: "#b91c1c",
                fontSize: "0.875rem",
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && children}
        </div>
      </div>
    </>
  );
}

// ─── KVList ──────────────────────────────────────────────────────────────────
export function KVList({ items }: { items: { label: string; value: unknown }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {items.map(({ label, value }) => {
        const strVal = value == null || value === "" ? null : String(value);
        const isStatus = STATUS_KEYS.has(label.toLowerCase().replace(/[_\s]/g, ""));
        const badge = isStatus && strVal ? statusStyle(strVal) : null;

        return (
          <div
            key={label}
            className="dd-item-card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "0.75rem",
              padding: "0.45rem 0.6rem",
              borderRadius: "6px",
              transition: "background 0.1s",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "#64748b",
                flexShrink: 0,
                width: "140px",
                paddingTop: "1px",
              }}
            >
              {label}
            </span>
            {badge ? (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: badge.color,
                  background: badge.bg,
                  padding: "2px 9px",
                  borderRadius: "999px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                }}
              >
                {strVal}
              </span>
            ) : (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: strVal ? "#1e293b" : "#94a3b8",
                  fontStyle: strVal ? "normal" : "italic",
                  wordBreak: "break-word",
                  textAlign: "right",
                  flex: 1,
                }}
              >
                {strVal ?? "—"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── DrawerSection ───────────────────────────────────────────────────────────
export function DrawerSection({
  heading,
  children,
  count,
}: {
  heading: string;
  children: ReactNode;
  count?: number;
}) {
  // Extract count from heading string like "Payroll Files (3)" if not passed as prop
  const resolvedCount =
    count !== undefined
      ? count
      : (() => {
          const m = heading.match(/\((\d+)\)/);
          return m ? parseInt(m[1], 10) : undefined;
        })();
  const cleanHeading = heading.replace(/\s*\(\d+\)$/, "");

  return (
    <div style={{ marginBottom: "1rem" }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#64748b",
          }}
        >
          {cleanHeading}
        </span>
        {resolvedCount !== undefined && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#3b82f6",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "0px 7px",
              borderRadius: "999px",
            }}
          >
            {resolvedCount}
          </span>
        )}
      </div>

      {/* Card container */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

