interface Column {
  name: string;
  type: string;
  nullable?: boolean;
  pk?: boolean;
  fk?: string;
  description: string;
}

interface SchemaTable {
  name: string;
  description: string;
  poweredFeatures: string[];
  columns: Column[];
}

const schema: { domain: string; tables: SchemaTable[] }[] = [
  {
    domain: "Plan & Sponsor",
    tables: [
      {
        name: "plans",
        description: "Core record for each retirement plan administered by a sponsor.",
        poweredFeatures: ["Sidebar plan filter", "Plan Overview header", "Multi-plan filtering"],
        columns: [
          { name: "plan_id", type: "varchar(32)", pk: true, description: "Unique plan identifier (e.g. PLAN-2024-0847)." },
          { name: "sponsor_id", type: "uuid", fk: "sponsors.id", description: "Owning plan sponsor." },
          { name: "name", type: "varchar(255)", description: "Display name of the plan." },
          { name: "plan_type", type: "varchar(32)", description: "401(k), 403(b), Profit Sharing, etc." },
          { name: "effective_date", type: "date", description: "Date the plan became effective." },
          { name: "record_keeper", type: "varchar(255)", description: "Recordkeeping firm name." },
          { name: "eligible_employees", type: "integer", description: "Count of currently eligible employees." },
          { name: "total_participants", type: "integer", description: "Count of active participants." },
          { name: "last_updated", type: "timestamptz", description: "Last refresh of plan metrics." },
        ],
      },
      {
        name: "sponsors",
        description: "Plan sponsor (employer) entity.",
        poweredFeatures: ["Sidebar branding", "Header user context"],
        columns: [
          { name: "id", type: "uuid", pk: true, description: "Sponsor unique identifier." },
          { name: "name", type: "varchar(255)", description: "Legal sponsor name." },
          { name: "industry", type: "varchar(64)", description: "Industry classification used for benchmarking." },
          { name: "employee_count_band", type: "varchar(32)", description: "Size band (e.g. 100-500) for peer comparisons." },
        ],
      },
    ],
  },
  {
    domain: "Participants & Demographics",
    tables: [
      {
        name: "participants",
        description: "Individual employee/participant records.",
        poweredFeatures: ["Participants page", "Demographic charts (age/tenure)", "HCE/NHCE compliance"],
        columns: [
          { name: "id", type: "uuid", pk: true, description: "Participant identifier." },
          { name: "plan_id", type: "varchar(32)", fk: "plans.plan_id", description: "Plan they belong to." },
          { name: "status", type: "varchar(16)", description: "active, terminated, retired, deceased." },
          { name: "hire_date", type: "date", description: "Date of hire (drives tenure)." },
          { name: "birth_date", type: "date", description: "Used for age cohort and catch-up eligibility." },
          { name: "compensation", type: "numeric(12,2)", description: "Annual eligible compensation." },
          { name: "is_hce", type: "boolean", description: "Highly Compensated Employee flag." },
          { name: "is_enrolled", type: "boolean", description: "Currently contributing participant." },
          { name: "auto_enrolled", type: "boolean", description: "Enrolled via auto-enrollment feature." },
          { name: "auto_increase_opt_in", type: "boolean", description: "Enrolled in auto-escalation (drives the 57% metric)." },
        ],
      },
      {
        name: "participant_balances",
        description: "Snapshot of account balance over time (monthly).",
        poweredFeatures: ["AUM trend chart", "Average balance KPI"],
        columns: [
          { name: "id", type: "bigserial", pk: true, description: "Surrogate key." },
          { name: "participant_id", type: "uuid", fk: "participants.id", description: "Owner of the balance." },
          { name: "as_of_date", type: "date", description: "Snapshot date (month-end)." },
          { name: "balance", type: "numeric(14,2)", description: "Total vested + unvested balance." },
          { name: "vested_balance", type: "numeric(14,2)", description: "Vested portion." },
        ],
      },
    ],
  },
  {
    domain: "Contributions & Match",
    tables: [
      {
        name: "contributions",
        description: "Per-payroll contribution records by source.",
        poweredFeatures: ["Avg deferral rate", "Employer match KPI", "YTD contributions", "What-If Simulator inputs"],
        columns: [
          { name: "id", type: "bigserial", pk: true, description: "Surrogate key." },
          { name: "participant_id", type: "uuid", fk: "participants.id", description: "Contributing participant." },
          { name: "payroll_date", type: "date", description: "Date of payroll posting." },
          { name: "source", type: "varchar(24)", description: "pre_tax, roth, after_tax, employer_match, profit_sharing." },
          { name: "amount", type: "numeric(12,2)", description: "Dollar amount." },
          { name: "deferral_pct", type: "numeric(5,2)", description: "Employee deferral percent at time of payroll." },
        ],
      },
      {
        name: "match_formulas",
        description: "Plan-level match formula configuration.",
        poweredFeatures: ["What-If Simulator", "Plan design recommendations"],
        columns: [
          { name: "plan_id", type: "varchar(32)", pk: true, fk: "plans.plan_id", description: "Plan key." },
          { name: "formula_type", type: "varchar(32)", description: "tiered, dollar_for_dollar, stretch, safe_harbor." },
          { name: "match_pct", type: "numeric(5,2)", description: "Employer match percentage." },
          { name: "match_cap_pct", type: "numeric(5,2)", description: "Cap on deferral matched (e.g. 6%)." },
          { name: "true_up", type: "boolean", description: "Whether annual true-up applies." },
        ],
      },
    ],
  },
  {
    domain: "Investments",
    tables: [
      {
        name: "investment_options",
        description: "Funds available within the plan lineup.",
        poweredFeatures: ["Investment Health page", "Asset allocation"],
        columns: [
          { name: "id", type: "uuid", pk: true, description: "Fund identifier." },
          { name: "plan_id", type: "varchar(32)", fk: "plans.plan_id", description: "Plan offering this fund." },
          { name: "ticker", type: "varchar(16)", description: "Fund ticker symbol." },
          { name: "name", type: "varchar(255)", description: "Display name of the fund." },
          { name: "asset_class", type: "varchar(32)", description: "equity, fixed_income, target_date, stable_value, etc." },
          { name: "expense_ratio", type: "numeric(6,4)", description: "Net expense ratio." },
          { name: "is_qdia", type: "boolean", description: "Designated as QDIA." },
        ],
      },
      {
        name: "participant_holdings",
        description: "Participant-level positions in investment options.",
        poweredFeatures: ["Allocation pie", "Diversification scoring"],
        columns: [
          { name: "id", type: "bigserial", pk: true, description: "Surrogate key." },
          { name: "participant_id", type: "uuid", fk: "participants.id", description: "Holder." },
          { name: "investment_id", type: "uuid", fk: "investment_options.id", description: "Fund." },
          { name: "as_of_date", type: "date", description: "Snapshot date." },
          { name: "balance", type: "numeric(14,2)", description: "Dollar value held." },
          { name: "allocation_pct", type: "numeric(5,2)", description: "Percent of participant's portfolio." },
        ],
      },
    ],
  },
  {
    domain: "Loans & Withdrawals",
    tables: [
      {
        name: "loans",
        description: "Active and historical participant loans.",
        poweredFeatures: ["Loan utilization KPI", "Operations page"],
        columns: [
          { name: "id", type: "uuid", pk: true, description: "Loan identifier." },
          { name: "participant_id", type: "uuid", fk: "participants.id", description: "Borrower." },
          { name: "issued_date", type: "date", description: "Loan origination date." },
          { name: "principal", type: "numeric(12,2)", description: "Original principal." },
          { name: "outstanding_balance", type: "numeric(12,2)", description: "Current outstanding balance." },
          { name: "interest_rate", type: "numeric(5,3)", description: "Loan interest rate." },
          { name: "status", type: "varchar(16)", description: "active, paid, defaulted." },
        ],
      },
      {
        name: "withdrawals",
        description: "Hardship and in-service withdrawals.",
        poweredFeatures: ["Hardship withdrawal rate", "Cash-out tracking"],
        columns: [
          { name: "id", type: "uuid", pk: true, description: "Withdrawal identifier." },
          { name: "participant_id", type: "uuid", fk: "participants.id", description: "Participant." },
          { name: "withdrawal_date", type: "date", description: "Effective date." },
          { name: "type", type: "varchar(24)", description: "hardship, in_service, rmd, cash_out, rollover." },
          { name: "amount", type: "numeric(12,2)", description: "Gross amount withdrawn." },
          { name: "reason", type: "varchar(64)", nullable: true, description: "Hardship reason code if applicable." },
        ],
      },
    ],
  },
  {
    domain: "Diagnostic Tests & Recommendations",
    tables: [
      {
        name: "diagnostic_tests",
        description: "Catalog of plan-health and operations tests.",
        poweredFeatures: ["Plan Check-Up", "Plan Health Tests", "Operations Tests"],
        columns: [
          { name: "id", type: "varchar(64)", pk: true, description: "Test slug (e.g. participation-rate)." },
          { name: "name", type: "varchar(128)", description: "Display name of the test." },
          { name: "category", type: "varchar(24)", description: "plan-health, operations, investments." },
          { name: "description", type: "text", description: "What the test measures." },
          { name: "benchmark", type: "varchar(32)", description: "Benchmark target value/string." },
          { name: "impact", type: "varchar(8)", description: "high, medium, low." },
          { name: "effort", type: "varchar(8)", description: "low, medium, high." },
        ],
      },
      {
        name: "test_results",
        description: "Most recent and historical diagnostic test outcomes per plan.",
        poweredFeatures: ["Pass/Warn/Fail pie", "Metric History dialog"],
        columns: [
          { name: "id", type: "bigserial", pk: true, description: "Surrogate key." },
          { name: "plan_id", type: "varchar(32)", fk: "plans.plan_id", description: "Plan tested." },
          { name: "test_id", type: "varchar(64)", fk: "diagnostic_tests.id", description: "Test executed." },
          { name: "as_of_date", type: "date", description: "Run date." },
          { name: "status", type: "varchar(8)", description: "pass, warn, fail." },
          { name: "current_value", type: "varchar(32)", description: "Result value as displayed." },
          { name: "numeric_value", type: "numeric(14,4)", nullable: true, description: "Machine-readable result." },
        ],
      },
      {
        name: "peer_benchmarks",
        description: "Peer-set distribution percentiles per test.",
        poweredFeatures: ["Benchmarking radar", "Percentile badges"],
        columns: [
          { name: "test_id", type: "varchar(64)", pk: true, fk: "diagnostic_tests.id", description: "Test key." },
          { name: "peer_set", type: "varchar(64)", pk: true, description: "Peer cohort label." },
          { name: "bottom_quartile", type: "varchar(32)", description: "25th percentile value." },
          { name: "median", type: "varchar(32)", description: "50th percentile value." },
          { name: "top_quartile", type: "varchar(32)", description: "75th percentile value." },
        ],
      },
      {
        name: "recommendations",
        description: "Actionable recommendations linked to failing/warning tests.",
        poweredFeatures: ["Recommendations page"],
        columns: [
          { name: "id", type: "uuid", pk: true, description: "Recommendation identifier." },
          { name: "plan_id", type: "varchar(32)", fk: "plans.plan_id", description: "Target plan." },
          { name: "test_id", type: "varchar(64)", fk: "diagnostic_tests.id", description: "Source test." },
          { name: "title", type: "varchar(255)", description: "Recommendation headline." },
          { name: "description", type: "text", description: "Detail of the action." },
          { name: "impact", type: "varchar(8)", description: "high, medium, low." },
          { name: "effort", type: "varchar(8)", description: "low, medium, high." },
          { name: "status", type: "varchar(16)", description: "open, in-progress, dismissed, completed." },
          { name: "potential_improvement", type: "varchar(64)", description: "Estimated lift if adopted." },
        ],
      },
    ],
  },
  {
    domain: "Operations",
    tables: [
      {
        name: "call_center_events",
        description: "Inbound participant call records.",
        poweredFeatures: ["Call volume KPI", "Top call reasons drill-down"],
        columns: [
          { name: "id", type: "bigserial", pk: true, description: "Surrogate key." },
          { name: "plan_id", type: "varchar(32)", fk: "plans.plan_id", description: "Plan in question." },
          { name: "call_timestamp", type: "timestamptz", description: "When the call occurred." },
          { name: "reason_code", type: "varchar(32)", description: "Categorized call reason." },
          { name: "duration_seconds", type: "integer", description: "Call duration." },
          { name: "wait_seconds", type: "integer", description: "Time to first agent." },
          { name: "resolved_first_call", type: "boolean", description: "First-call resolution flag." },
        ],
      },
      {
        name: "payroll_files",
        description: "Status of recurring payroll file uploads.",
        poweredFeatures: ["Payroll file processing tile"],
        columns: [
          { name: "id", type: "bigserial", pk: true, description: "Surrogate key." },
          { name: "plan_id", type: "varchar(32)", fk: "plans.plan_id", description: "Plan." },
          { name: "received_at", type: "timestamptz", description: "File receipt timestamp." },
          { name: "processed_at", type: "timestamptz", nullable: true, description: "Processing completion." },
          { name: "status", type: "varchar(16)", description: "received, processed, error, late." },
          { name: "error_count", type: "integer", description: "Records that failed validation." },
        ],
      },
      {
        name: "compliance_filings",
        description: "Annual audits, 5500 filings, and tax filings.",
        poweredFeatures: ["Annual audit & tax filing tiles in Operations"],
        columns: [
          { name: "id", type: "uuid", pk: true, description: "Filing identifier." },
          { name: "plan_id", type: "varchar(32)", fk: "plans.plan_id", description: "Plan." },
          { name: "filing_type", type: "varchar(32)", description: "annual_audit, form_5500, form_8955, tax_filing." },
          { name: "plan_year", type: "integer", description: "Plan year covered." },
          { name: "due_date", type: "date", description: "Statutory due date." },
          { name: "filed_date", type: "date", nullable: true, description: "Date filed (null if outstanding)." },
          { name: "status", type: "varchar(16)", description: "passing, in_progress, overdue, exception." },
        ],
      },
    ],
  },
  {
    domain: "Education, Documents & AI",
    tables: [
      {
        name: "education_campaigns",
        description: "Participant education outreach campaigns.",
        poweredFeatures: ["Participant Education page"],
        columns: [
          { name: "id", type: "uuid", pk: true, description: "Campaign identifier." },
          { name: "plan_ids", type: "varchar(32)[]", description: "Plans included in the campaign." },
          { name: "name", type: "varchar(255)", description: "Campaign name." },
          { name: "type", type: "varchar(24)", description: "Email, Webinar, Workshop, Video, Newsletter, One-on-One." },
          { name: "topic", type: "varchar(64)", description: "Education topic." },
          { name: "target_audience", type: "varchar(255)", description: "Audience selector description." },
          { name: "date_launched", type: "date", description: "Launch date." },
          { name: "date_ended", type: "date", nullable: true, description: "End date if applicable." },
          { name: "participants_reached", type: "integer", description: "Distinct participants reached." },
          { name: "engagement_rate", type: "numeric(5,2)", description: "Percent engaged." },
          { name: "status", type: "varchar(16)", description: "Active, Completed, Scheduled." },
        ],
      },
      {
        name: "documents",
        description: "Plan document repository (SPDs, 5500s, notices).",
        poweredFeatures: ["Documents page"],
        columns: [
          { name: "id", type: "uuid", pk: true, description: "Document identifier." },
          { name: "plan_id", type: "varchar(32)", fk: "plans.plan_id", description: "Owning plan." },
          { name: "name", type: "varchar(255)", description: "Document title." },
          { name: "category", type: "varchar(32)", description: "SPD, 5500, notice, amendment, audit." },
          { name: "file_url", type: "text", description: "Storage URL." },
          { name: "uploaded_at", type: "timestamptz", description: "Upload timestamp." },
          { name: "plan_year", type: "integer", nullable: true, description: "Applicable plan year." },
        ],
      },
      {
        name: "ai_interactions",
        description: "Logs of RetirementAI chat and What-If Simulator runs.",
        poweredFeatures: ["RetirementAI", "What-If Simulator", "Usage dashboard"],
        columns: [
          { name: "id", type: "uuid", pk: true, description: "Interaction identifier." },
          { name: "user_id", type: "uuid", description: "User who initiated." },
          { name: "plan_id", type: "varchar(32)", fk: "plans.plan_id", description: "Plan context." },
          { name: "feature", type: "varchar(32)", description: "retirementai_chat, what_if, explain_test, forecast." },
          { name: "prompt", type: "text", description: "User prompt." },
          { name: "response", type: "text", description: "Model response." },
          { name: "input_tokens", type: "integer", description: "Tokens consumed in prompt." },
          { name: "output_tokens", type: "integer", description: "Tokens generated." },
          { name: "cost_usd", type: "numeric(10,4)", description: "Cost of the call." },
          { name: "created_at", type: "timestamptz", description: "When the call occurred." },
        ],
      },
      {
        name: "usage_events",
        description: "Generic activity log for Usage analytics.",
        poweredFeatures: ["Usage page", "Active users metric"],
        columns: [
          { name: "id", type: "bigserial", pk: true, description: "Surrogate key." },
          { name: "user_id", type: "uuid", description: "Acting user." },
          { name: "event_type", type: "varchar(48)", description: "page_view, test_opened, recommendation_action, export." },
          { name: "page", type: "varchar(64)", nullable: true, description: "Page route if applicable." },
          { name: "occurred_at", type: "timestamptz", description: "Event timestamp." },
        ],
      },
    ],
  },
];

export function DataSchema() {
  const totalTables = schema.reduce((s, d) => s + d.tables.length, 0);
  const totalColumns = schema.reduce(
    (s, d) => s + d.tables.reduce((c, t) => c + t.columns.length, 0),
    0,
  );

  return (
    <section className="page-shell" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ marginBottom: "0.5rem" }}>Data Schema</h1>
        <p style={{ margin: 0 }}>
          Hardcoded reference for tables and columns. {totalTables} tables, {totalColumns} columns across {schema.length} domains.
        </p>
      </div>

      {schema.map((domain) => (
        <section key={domain.domain} style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>{domain.domain}</h2>
          {domain.tables.map((table) => (
            <div key={table.name} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.875rem" }}>
              <h3 style={{ margin: "0 0 0.25rem" }}>{table.name}</h3>
              <p style={{ margin: "0 0 0.5rem", color: "#6b7280" }}>{table.description}</p>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#374151" }}>
                Powered features: {table.poweredFeatures.join(", ")}
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ background: "#f3f4f6" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.625rem", borderBottom: "1px solid #e5e7eb" }}>Column</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.625rem", borderBottom: "1px solid #e5e7eb" }}>Type</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.625rem", borderBottom: "1px solid #e5e7eb" }}>Constraints</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.625rem", borderBottom: "1px solid #e5e7eb" }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.columns.map((col) => {
                      const constraints = [
                        col.pk ? "PK" : "",
                        col.fk ? `FK -> ${col.fk}` : "",
                        col.nullable ? "nullable" : "",
                      ]
                        .filter(Boolean)
                        .join(", ");

                      return (
                        <tr key={col.name} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "0.5rem 0.625rem", fontFamily: "monospace" }}>{col.name}</td>
                          <td style={{ padding: "0.5rem 0.625rem", fontFamily: "monospace" }}>{col.type}</td>
                          <td style={{ padding: "0.5rem 0.625rem" }}>{constraints || "-"}</td>
                          <td style={{ padding: "0.5rem 0.625rem" }}>{col.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      ))}
    </section>
  );
}
