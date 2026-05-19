from fastapi import APIRouter, HTTPException
import psycopg2
import os
from pathlib import Path
from dotenv import load_dotenv
from ..schema import schema as models

router = APIRouter()
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


# ✅ DB connection
def get_connection():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "5432")),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        dbname=os.getenv("DB_NAME", "postgres"),
    )


# ✅ helper to convert rows → dict
def fetch_as_dict(cursor):
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    return [dict(zip(columns, row)) for row in rows]


# ==========================================
#  GET /plans  (list all plan IDs + metadata)
# ==========================================

@router.get("/plans")
def get_all_plans():
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT plan_id, name, plan_type FROM plans ORDER BY plan_id")
        plans = fetch_as_dict(cursor)
        return {"plans": plans}
    except psycopg2.OperationalError:
        # DB not reachable — return empty list so the UI degrades gracefully
        return {"plans": [], "error": "Database unavailable"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
#  GET /documents  (all documents, single query)
# ==========================================

@router.get("/documents")
def get_all_documents():
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                id,
                name,
                category AS "type",
                file_url AS "url",
                plan_year AS "planYear",
                uploaded_at AS "uploadedAt",
                plan_id
            FROM documents
            ORDER BY plan_id, uploaded_at DESC
        """)
        documents = fetch_as_dict(cursor)
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
#  GET /campaigns  (all campaigns, single query)
# ==========================================

@router.get("/campaigns")
def get_all_campaigns():
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM education_campaigns ORDER BY date_launched DESC")
        campaigns = fetch_as_dict(cursor)
        return {"campaigns": campaigns}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
#  GET /payroll-files  (all payroll files, single query)
# ==========================================

@router.get("/payroll-files")
def get_all_payroll_files():
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM payroll_files ORDER BY plan_id, received_at DESC")
        payroll_files = fetch_as_dict(cursor)
        return {"payroll_files": payroll_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
#  GET /recommendations  (all plans, single query)
# ==========================================

@router.get("/recommendations")
def get_all_recommendations():
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                id,
                plan_id AS "planId",
                test_id AS "testId",
                title,
                description,
                impact,
                effort,
                status,
                potential_improvement AS "potentialImprovement"
            FROM recommendations
            ORDER BY plan_id
        """)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        recommendations = [dict(zip(columns, row)) for row in rows]
        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
#  GET /plan-health  (all plans, single pass)
# ==========================================

@router.get("/plan-health")
def get_all_plan_health():
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM test_results")
        test_results = fetch_as_dict(cursor)

        cursor.execute("SELECT * FROM diagnostic_tests")
        diagnostic_tests_list = fetch_as_dict(cursor)
        diagnostic_tests = {r["id"]: r for r in diagnostic_tests_list}

        cursor.execute("SELECT * FROM peer_benchmarks")
        peer_benchmarks_list = fetch_as_dict(cursor)
        peer_benchmarks = {r["test_id"]: r for r in peer_benchmarks_list if r.get("test_id")}

        cursor.execute("SELECT * FROM recommendations")
        all_recs = fetch_as_dict(cursor)
        # key: (plan_id, test_id) -> best rec
        rec_map: dict = {}
        for r in all_recs:
            key = (r.get("plan_id"), r.get("test_id"))
            if key not in rec_map:
                rec_map[key] = r

        joined_tests = []
        seen: set = set()
        for tr in test_results:
            plan_id = tr.get("plan_id")
            test_id = tr.get("test_id")
            dt = diagnostic_tests.get(test_id)
            if not dt:
                continue
            dedup_key = f"{plan_id}-{test_id}"
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            rec = rec_map.get((plan_id, test_id))
            bm = peer_benchmarks.get(test_id)

            joined_tests.append({
                "planId": plan_id,
                "id": dt.get("id"),
                "name": dt.get("name"),
                "category": dt.get("category"),
                "status": tr.get("status"),
                "currentValue": tr.get("current_value"),
                "benchmark": dt.get("benchmark"),
                "description": dt.get("description"),
                "recommendation": rec.get("description") if rec else None,
                "impact": dt.get("impact"),
                "effort": dt.get("effort"),
            })

        serialized_recs = []
        for rec in all_recs:
            test_id = rec.get("test_id")
            dt = diagnostic_tests.get(test_id)
            if not dt:
                continue
            serialized_recs.append({
                "id": rec.get("id"),
                "planId": rec.get("plan_id"),
                "testId": rec.get("test_id"),
                "testName": dt.get("name"),
                "category": dt.get("category"),
                "title": rec.get("title"),
                "description": rec.get("description"),
                "impact": rec.get("impact"),
                "effort": rec.get("effort"),
                "status": rec.get("status"),
                "potentialImprovement": rec.get("potential_improvement"),
            })

        return {"diagnostic_tests": joined_tests, "recommendations": serialized_recs}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
#  GET /check-up  (all plans, single pass)
# ==========================================

@router.get("/check-up")
def get_all_checkup():
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM diagnostic_tests")
        diagnostic_map = {d["id"]: d for d in fetch_as_dict(cursor)}

        cursor.execute("SELECT * FROM test_results")
        test_results = fetch_as_dict(cursor)

        cursor.execute("SELECT * FROM peer_benchmarks")
        peer_map = {p["test_id"]: p for p in fetch_as_dict(cursor) if p.get("test_id")}

        cursor.execute("SELECT * FROM recommendations")
        rec_map: dict = {}
        for r in fetch_as_dict(cursor):
            key = (r.get("plan_id"), r.get("test_id"))
            if key not in rec_map:
                rec_map[key] = r

        cursor.execute("SELECT * FROM ai_interactions")
        ai_map: dict = {}
        for a in fetch_as_dict(cursor):
            key = (a.get("plan_id"), a.get("feature"))
            if key not in ai_map:
                ai_map[key] = a

        checkup_results = []
        for tr in test_results:
            plan_id = tr.get("plan_id")
            test_id = tr.get("test_id")
            dt = diagnostic_map.get(test_id)
            if not dt:
                continue
            bm = peer_map.get(test_id)
            rec = rec_map.get((plan_id, test_id))
            ai = ai_map.get((plan_id, test_id))

            checkup_results.append({
                "planId": plan_id,
                "testId": dt.get("id"),
                "name": dt.get("name"),
                "category": dt.get("category"),
                "description": dt.get("description"),
                "value": tr.get("numeric_value") or tr.get("current_value"),
                "resultStatus": tr.get("status"),
                "benchmark": dt.get("benchmark"),
                "percentile": bm.get("percentile") if bm else None,
                "bottomQuartile": bm.get("bottom_quartile") if bm else None,
                "median": bm.get("median") if bm else None,
                "topQuartile": bm.get("top_quartile") if bm else None,
                "recommendationTitle": rec.get("title") if rec else None,
                "recommendation": rec.get("description") if rec else None,
                "impact": rec.get("impact") if rec else None,
                "effort": rec.get("effort") if rec else None,
                "recommendationStatus": rec.get("status") if rec else None,
                "aiExplanation": ai.get("response") if ai else None,
            })

        return {"checkup": checkup_results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
#  GET /plans/{plan_id}/campaigns
# ==========================================
@router.get("/plans/{plan_id}/campaigns")
def get_plan_campaigns(plan_id: str):
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT 1 FROM plans WHERE plan_id = %s",
            (plan_id,)
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        cursor.execute(
            "SELECT * FROM education_campaigns WHERE %s = ANY(plan_ids)",
            (plan_id,)
        )

        campaigns = fetch_as_dict(cursor)

        if not campaigns:
            return {"campaigns": []}   

        return {"campaigns": campaigns}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==========================================
#  GET /plans/{plan_id}/documents
# ==========================================

@router.get("/plans/{plan_id}/documents")
def get_plan_documents(plan_id: str):
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ✅ Check if plan exists
        cursor.execute(
            "SELECT 1 FROM plans WHERE plan_id = %s",
            (plan_id,)
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        # ✅ Fetch documents
        cursor.execute("""
            SELECT
                id AS id,
                name AS "name",
                category AS "type",
                file_url AS "url",
                plan_year AS "planYear",
                uploaded_at AS "uploadedAt",
                plan_id
                FROM documents
                WHERE plan_id = %s
            """, (plan_id,))
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()

        documents = [
            dict(zip(columns, row)) for row in rows
        ]

        return {"documents": documents}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==========================================
#  GET /api/data-schema
# ==========================================

@router.get("/data-schema")
def get_data_schema():
    return {
        "sheets": [
            {"sheet_name": "users", "columns": list(models.UserSchema.model_fields.keys())},
            {"sheet_name": "sponsors", "columns": list(models.SponsorSchema.model_fields.keys())},
            {"sheet_name": "plans", "columns": list(models.PlanSchema.model_fields.keys())},
            {"sheet_name": "participants", "columns": list(models.ParticipantSchema.model_fields.keys())},
            {"sheet_name": "participant_balances", "columns": list(models.ParticipantBalanceSchema.model_fields.keys())},
            {"sheet_name": "contributions", "columns": list(models.ContributionSchema.model_fields.keys())},
            {"sheet_name": "match_formula", "columns": list(models.MatchFormulaSchema.model_fields.keys())},
            {"sheet_name": "investment_options", "columns": list(models.InvestmentOptionSchema.model_fields.keys())},
            {"sheet_name": "participant_holdings", "columns": list(models.ParticipantHoldingSchema.model_fields.keys())},
            {"sheet_name": "loans", "columns": list(models.LoanSchema.model_fields.keys())},
            {"sheet_name": "withdrawals", "columns": list(models.WithdrawalSchema.model_fields.keys())},
            {"sheet_name": "diagnostic_tests", "columns": list(models.DiagnosticTestSchema.model_fields.keys())},
            {"sheet_name": "test_results", "columns": list(models.TestResultSchema.model_fields.keys())},
            {"sheet_name": "peer_benchmarks", "columns": list(models.PeerBenchmarkSchema.model_fields.keys())},
            {"sheet_name": "recommendations", "columns": list(models.RecommendationSchema.model_fields.keys())},
            {"sheet_name": "call_center_events", "columns": list(models.CallCenterEventSchema.model_fields.keys())},
            {"sheet_name": "payroll_files", "columns": list(models.PayrollFileSchema.model_fields.keys())},
            {"sheet_name": "compliance_filings", "columns": list(models.ComplianceFilingSchema.model_fields.keys())},
            {"sheet_name": "education_campaigns", "columns": list(models.EducationCampaignSchema.model_fields.keys())},
            {"sheet_name": "documents", "columns": list(models.DocumentSchema.model_fields.keys())},
            {"sheet_name": "ai_interactions", "columns": list(models.AIInteractionSchema.model_fields.keys())}
        ]
    }

# ==========================================
#  GET plans/{plan-id}/recommendations
# ==========================================

@router.get("/plans/{plan_id}/recommendations")
def get_plan_recommendations(plan_id: str):
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ✅ Check if plan exists
        cursor.execute(
            "SELECT 1 FROM plans WHERE plan_id = %s",
            (plan_id,)
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        # ✅ Fetch recommendations
        cursor.execute("""
            SELECT
                id,
                plan_id AS "planId",
                test_id AS "testId",
                title,
                description,
                impact,
                effort,
                status,
                potential_improvement AS "potentialImprovement"
            FROM recommendations
            WHERE plan_id = %s
        """, (plan_id,))

        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()

        recommendations = [
            dict(zip(columns, row))
            for row in rows
        ]

        return {"recommendations": recommendations}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==========================================
#  GET plans/{plan-id}/plan-health
# ==========================================

@router.get("/plans/{plan_id}/plan-health")
def get_plan_health(plan_id: str):
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ✅ 1. Check plan exists
        cursor.execute(
            "SELECT plan_id FROM plans WHERE plan_id = %s",
            (plan_id,)
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        # ✅ 2. Fetch data
        cursor.execute("SELECT * FROM test_results WHERE plan_id = %s", (plan_id,))
        test_results = fetch_as_dict(cursor)

        cursor.execute("SELECT * FROM diagnostic_tests")
        diagnostic_tests_list = fetch_as_dict(cursor)
        diagnostic_tests = {r["id"]: r for r in diagnostic_tests_list}

        cursor.execute("SELECT * FROM peer_benchmarks")
        peer_benchmarks_list = fetch_as_dict(cursor)
        peer_benchmarks = {
            r["test_id"]: r for r in peer_benchmarks_list if r.get("test_id")
        }

        cursor.execute("SELECT * FROM recommendations WHERE plan_id = %s", (plan_id,))
        recommendations = fetch_as_dict(cursor)

        # ✅ 3. Map recommendations by test_id
        recommendations_by_test_id = {
            r["test_id"]: r for r in recommendations if r.get("test_id")
        }

        joined_tests = []
        filtered_test_ids = set()

        # ✅ 4. Join test data
        for tr in test_results:
            test_id = tr.get("test_id")
            dt = diagnostic_tests.get(test_id)

            if not dt:
                continue

            filtered_test_ids.add(test_id)
            rec = recommendations_by_test_id.get(test_id)
            bm = peer_benchmarks.get(test_id)

            joined_tests.append({
                "id": dt.get("id"),
                "name": dt.get("name"),
                "category": dt.get("category"),
                "status": tr.get("status"),
                "currentValue": tr.get("current_value"),
                "benchmark": dt.get("benchmark"),
                "description": dt.get("description"),
                "recommendation": rec.get("description") if rec else None,
                "impact": dt.get("impact"),
                "effort": dt.get("effort"),
                "details": [
                    *(
                        [{"label": "As of date", "value": str(tr.get("as_of_date"))}]
                        if tr.get("as_of_date") else []
                    ),
                    *(
                        [{"label": "Numeric value", "value": str(tr.get("numeric_value"))}]
                        if tr.get("numeric_value") else []
                    ),
                ],
                "peerBenchmark": {
                    "bottomQuartile": bm.get("bottom_quartile") if bm else None,
                    "median": bm.get("median") if bm else None,
                    "topQuartile": bm.get("top_quartile") if bm else None,
                    "peerSet": bm.get("peer_set") if bm else None,
                },
            })

        # ✅ 5. Build recommendations output
        serialized_recs = []
        for rec in recommendations:
            test_id = rec.get("test_id")
            dt = diagnostic_tests.get(test_id)

            if not dt or test_id not in filtered_test_ids:
                continue

            serialized_recs.append({
                "id": rec.get("id"),
                "testId": rec.get("test_id"),
                "testName": dt.get("name"),
                "category": dt.get("category"),
                "title": rec.get("title"),
                "description": rec.get("description"),
                "impact": rec.get("impact"),
                "effort": rec.get("effort"),
                "status": rec.get("status"),
                "potentialImprovement": rec.get("potential_improvement"),
            })

        return {
            "diagnostic_tests": joined_tests,
            "recommendations": serialized_recs
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==========================================
#  GET plans/{plan-id}/operations
# ==========================================

@router.get("/plans/{plan_id}/operations")
def get_plan_operations(plan_id: str):
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ✅ 1. Check if plan exists
        cursor.execute(
            "SELECT plan_id FROM plans WHERE plan_id = %s",
            (plan_id,)
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        # ✅ 2. Fetch all required data
        cursor.execute("SELECT * FROM diagnostic_tests")
        diagnostic_tests = fetch_as_dict(cursor)

        cursor.execute(
            "SELECT * FROM test_results WHERE plan_id = %s",
            (plan_id,)
        )
        test_results = fetch_as_dict(cursor)

        cursor.execute(
            "SELECT * FROM recommendations WHERE plan_id = %s",
            (plan_id,)
        )
        recommendations = fetch_as_dict(cursor)

        cursor.execute(
            "SELECT * FROM payroll_files WHERE plan_id = %s",
            (plan_id,)
        )
        payroll_files = fetch_as_dict(cursor)

        # ✅ 3. Latest test result per test_id
        latest_by_test = {}

        for tr in test_results:
            test_id = tr.get("test_id")
            if not test_id:
                continue

            existing = latest_by_test.get(test_id)
            if existing is None:
                latest_by_test[test_id] = tr
                continue

            # compare dates
            existing_date = existing.get("as_of_date")
            new_date = tr.get("as_of_date")

            if new_date and (existing_date is None or new_date > existing_date):
                latest_by_test[test_id] = tr

        # ✅ 4. Best recommendation per test_id (based on status priority)
        rec_by_test = {}

        def get_priority(status):
            priority_map = {
                "critical": 3,
                "high": 2,
                "medium": 1,
                "low": 0
            }
            return priority_map.get((status or "").lower(), -1)

        for rec in recommendations:
            test_id = rec.get("test_id")
            if not test_id:
                continue

            existing = rec_by_test.get(test_id)

            if existing is None or get_priority(rec.get("status")) > get_priority(existing.get("status")):
                rec_by_test[test_id] = rec

        # ✅ 5. Build operations tests
        operations_tests = []

        for dt in diagnostic_tests:
            test_id = dt.get("id")

            tr = latest_by_test.get(test_id)
            rec = rec_by_test.get(test_id)

            operations_tests.append({
                **dt,
                "status": tr.get("status") if tr else None,
                "currentValue": tr.get("current_value") if tr else None,
                "recommendation": rec.get("description") if rec else None,
            })

        return {
            "operations_tests": operations_tests,
            "payroll_files": payroll_files,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==========================================
#  GET plans/{plan-id}/check-up
# ==========================================

@router.get("/plans/{plan_id}/check-up")
def get_plan_checkup(plan_id: str):
    conn, cursor = None, None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ✅ 1. Check if plan exists
        cursor.execute(
            "SELECT plan_id FROM plans WHERE plan_id = %s",
            (plan_id,)
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        # ✅ 2. Fetch diagnostic tests
        cursor.execute("SELECT * FROM diagnostic_tests")
        diagnostic_tests = fetch_as_dict(cursor)
        diagnostic_map = {d["id"]: d for d in diagnostic_tests}

        # ✅ 3. Fetch test results
        cursor.execute(
            "SELECT * FROM test_results WHERE plan_id = %s",
            (plan_id,)
        )
        test_results = fetch_as_dict(cursor)

        # ✅ 4. Fetch peer benchmarks
        cursor.execute("SELECT * FROM peer_benchmarks")
        peer_benchmarks = fetch_as_dict(cursor)
        peer_map = {
            p["test_id"]: p for p in peer_benchmarks if p.get("test_id")
        }

        # ✅ 5. Fetch recommendations
        cursor.execute(
            "SELECT * FROM recommendations WHERE plan_id = %s",
            (plan_id,)
        )
        recommendations = fetch_as_dict(cursor)
        rec_map = {
            r["test_id"]: r for r in recommendations if r.get("test_id")
        }

        # ✅ ✅ FIXED: use ai_interactions (not ai_explanations)
        cursor.execute(
            "SELECT * FROM ai_interactions WHERE plan_id = %s",
            (plan_id,)
        )
        ai_interactions = fetch_as_dict(cursor)

        # We assume feature maps to test_id
        ai_map = {
            a.get("feature"): a for a in ai_interactions if a.get("feature")
        }

        # ✅ 6. Build response
        checkup_results = []

        for tr in test_results:
            test_id = tr.get("test_id")
            dt = diagnostic_map.get(test_id)

            if not dt:
                continue

            bm = peer_map.get(test_id)
            rec = rec_map.get(test_id)
            ai = ai_map.get(test_id)

            checkup_results.append({
                # ✅ diagnostic_tests
                "testId": dt.get("id"),
                "name": dt.get("name"),
                "category": dt.get("category"),
                "status": dt.get("status"),
                "description": dt.get("description"),
                "impactScore": dt.get("impact"),
                "lastRunAt": dt.get("last_run_at"),

                # ✅ test_results
                "value": tr.get("numeric_value") or tr.get("current_value"),
                "resultStatus": tr.get("status"),

                # ✅ benchmark
                "benchmark": dt.get("benchmark"),

                # ✅ peer benchmarks
                "percentile": bm.get("percentile") if bm else None,
                "bottomQuartile": bm.get("bottom_quartile") if bm else None,
                "median": bm.get("median") if bm else None,
                "topQuartile": bm.get("top_quartile") if bm else None,

                # ✅ recommendations
                "recommendationTitle": rec.get("title") if rec else None,
                "recommendation": rec.get("description") if rec else None,
                "impact": rec.get("impact") if rec else None,
                "effort": rec.get("effort") if rec else None,
                "recommendationStatus": rec.get("status") if rec else None,

                # ✅ AI explanation (FIXED)
                "aiExplanation": ai.get("response") if ai else None,
            })

        return {"checkup": checkup_results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()