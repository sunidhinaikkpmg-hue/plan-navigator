from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from backend.app.db.connect import (
	get_ai_interactions,
	get_campaigns,
	get_data_schema as get_workbook_data_schema,
	get_diagnostic_tests,
	get_documents,
	get_payroll_files,
	get_peer_benchmarks,
	get_plan,
	get_recommendations,
	get_test_results,
	get_usage_events,
)

router = APIRouter()

VALID_STATUSES = ("pass", "warn", "fail")
DAY_LABELS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")


@router.get("/data-schema")
def get_data_schema(
	offset: int = Query(default=0, ge=0),
	limit: int = Query(default=10, ge=1, le=1000),
) -> dict[str, Any]:
	return get_workbook_data_schema(offset=offset, limit=limit)


def _coerce_float(value: Any) -> float | None:
	if value is None or value == "":
		return None
	try:
		return float(value)
	except (TypeError, ValueError):
		return None


def _format_value(value: Any) -> str | None:
	if value is None or value == "":
		return None
	return str(value)


def _build_percentile(current_value: Any, benchmark_row: dict[str, Any] | None) -> int | None:
	if not benchmark_row:
		return None

	current = _coerce_float(current_value)
	bottom = _coerce_float(benchmark_row.get("bottom_quartile"))
	median = _coerce_float(benchmark_row.get("median"))
	top = _coerce_float(benchmark_row.get("top_quartile"))
	if None in (current, bottom, median, top):
		return None

	if current <= bottom:
		percentile = 25 * (current / bottom) if bottom else 0
	elif current <= median:
		span = median - bottom
		percentile = 25 + (25 * (current - bottom) / span if span else 0)
	elif current <= top:
		span = top - median
		percentile = 50 + (25 * (current - median) / span if span else 0)
	else:
		percentile = 75 + (25 * ((current - top) / top) if top else 25)

	return max(0, min(100, round(percentile)))


def _build_test_details(test_result: dict[str, Any]) -> list[dict[str, str]]:
	details: list[dict[str, str]] = []

	as_of_date = _format_value(test_result.get("as_of_date"))
	if as_of_date:
		details.append({"label": "As of date", "value": as_of_date})

	numeric_value = _format_value(test_result.get("numeric_value"))
	if numeric_value:
		details.append({"label": "Numeric value", "value": numeric_value})

	return details


def _build_summary(test_rows: list[dict[str, Any]]) -> dict[str, int]:
	summary = {status: 0 for status in VALID_STATUSES}
	for row in test_rows:
		status = row.get("status")
		if status in summary:
			summary[status] += 1
	return summary


def _parse_iso_datetime(value: Any) -> datetime | None:
	if not isinstance(value, str) or not value:
		return None
	try:
		return datetime.fromisoformat(value.replace("Z", "+00:00"))
	except ValueError:
		return None


def _interaction_tokens(row: dict[str, Any]) -> int:
	input_tokens = int(row.get("input_tokens") or 0)
	output_tokens = int(row.get("output_tokens") or 0)
	return input_tokens + output_tokens


def _usage_analytics(ai_rows: list[dict[str, Any]], usage_rows: list[dict[str, Any]]) -> dict[str, Any]:
	interactions_with_time = []
	for row in ai_rows:
		ts = _parse_iso_datetime(row.get("created_at"))
		if ts is None:
			continue
		interactions_with_time.append((row, ts))

	interactions_with_time.sort(key=lambda item: item[1])

	monthly_buckets: dict[str, dict[str, float]] = defaultdict(lambda: {"tokens": 0, "cost": 0.0})
	daily_buckets: dict[str, dict[str, Any]] = defaultdict(lambda: {"queries": 0, "tokens": 0, "users": set()})
	feature_tokens: dict[str, int] = defaultdict(int)
	user_metrics: dict[str, dict[str, Any]] = defaultdict(lambda: {"queries": 0, "tokens": 0, "last_seen": None})
	recent_sessions = []

	for row, ts in interactions_with_time:
		tokens = _interaction_tokens(row)
		month_key = ts.strftime("%Y-%m")
		month_label = ts.strftime("%b")
		monthly_buckets[month_key]["month"] = month_label
		monthly_buckets[month_key]["tokens"] += tokens
		monthly_buckets[month_key]["cost"] += float(row.get("cost_usd") or 0)

		date_key = ts.strftime("%Y-%m-%d")
		daily_buckets[date_key]["day"] = DAY_LABELS[ts.weekday()]
		daily_buckets[date_key]["queries"] += 1
		daily_buckets[date_key]["tokens"] += tokens
		if row.get("user_id"):
			daily_buckets[date_key]["users"].add(row.get("user_id"))

		feature = str(row.get("feature") or "other")
		feature_tokens[feature] += tokens

		user_id = str(row.get("user_id") or "unknown")
		user_metrics[user_id]["queries"] += 1
		user_metrics[user_id]["tokens"] += tokens
		user_metrics[user_id]["last_seen"] = ts

		recent_sessions.append(
			{
				"id": row.get("id"),
				"userId": row.get("user_id"),
				"planId": row.get("plan_id"),
				"query": row.get("prompt"),
				"feature": row.get("feature"),
				"inputTokens": int(row.get("input_tokens") or 0),
				"outputTokens": int(row.get("output_tokens") or 0),
				"tokens": tokens,
				"costUsd": float(row.get("cost_usd") or 0),
				"createdAt": row.get("created_at"),
			}
		)

	monthly_usage = [
		{
			"month": monthly_buckets[key]["month"],
			"tokens": int(monthly_buckets[key]["tokens"]),
			"cost": round(float(monthly_buckets[key]["cost"]), 4),
		}
		for key in sorted(monthly_buckets.keys())[-6:]
	]

	daily_dates = sorted(daily_buckets.keys())[-7:]
	daily_usage = [
		{
			"day": daily_buckets[date_key]["day"],
			"sessions": len(daily_buckets[date_key]["users"]),
			"queries": int(daily_buckets[date_key]["queries"]),
			"tokens": int(daily_buckets[date_key]["tokens"]),
		}
		for date_key in daily_dates
	]

	total_feature_tokens = sum(feature_tokens.values())
	feature_usage = [
		{
			"name": feature,
			"tokens": tokens,
			"value": round((tokens / total_feature_tokens) * 100, 1) if total_feature_tokens else 0,
		}
		for feature, tokens in sorted(feature_tokens.items(), key=lambda item: item[1], reverse=True)
	]

	monthly_user_sets: dict[str, set[str]] = defaultdict(set)
	first_seen_month: dict[str, str] = {}
	for row, ts in interactions_with_time:
		user_id = str(row.get("user_id") or "unknown")
		month_key = ts.strftime("%Y-%m")
		monthly_user_sets[month_key].add(user_id)
		first_seen_month.setdefault(user_id, month_key)

	active_users = []
	for month_key in sorted(monthly_user_sets.keys())[-6:]:
		new_users = sum(1 for user_id in monthly_user_sets[month_key] if first_seen_month.get(user_id) == month_key)
		active_users.append(
			{
				"month": datetime.strptime(month_key, "%Y-%m").strftime("%b"),
				"active": len(monthly_user_sets[month_key]),
				"new": new_users,
			}
		)

	top_users = [
		{
			"userId": user_id,
			"queries": values["queries"],
			"tokens": values["tokens"],
			"lastActive": values["last_seen"].isoformat() if values["last_seen"] else None,
		}
		for user_id, values in sorted(
			user_metrics.items(),
			key=lambda item: (item[1]["queries"], item[1]["tokens"]),
			reverse=True,
		)[:10]
	]

	recent_sessions = sorted(recent_sessions, key=lambda session: session["createdAt"], reverse=True)[:10]

	total_tokens = sum(month["tokens"] for month in monthly_usage)
	total_cost = sum(month["cost"] for month in monthly_usage)
	token_growth = 0.0
	if len(monthly_usage) >= 2 and monthly_usage[-2]["tokens"]:
		token_growth = round(((monthly_usage[-1]["tokens"] - monthly_usage[-2]["tokens"]) / monthly_usage[-2]["tokens"]) * 100, 1)

	avg_queries_per_day = round(sum(day["queries"] for day in daily_usage) / len(daily_usage)) if daily_usage else 0
	current_active_users = active_users[-1]["active"] if active_users else 0
	new_users_this_month = active_users[-1]["new"] if active_users else 0

	usage_events_with_time = []
	for row in usage_rows:
		ts = _parse_iso_datetime(row.get("occurred_at"))
		if ts is None:
			continue
		usage_events_with_time.append((row, ts))

	event_type_counts: dict[str, int] = defaultdict(int)
	page_counts: dict[str, int] = defaultdict(int)
	event_daily_buckets: dict[str, dict[str, Any]] = defaultdict(lambda: {"events": 0, "users": set()})

	for row, ts in usage_events_with_time:
		event_type = str(row.get("event_type") or "unknown")
		page = str(row.get("page") or "unknown")
		event_type_counts[event_type] += 1
		page_counts[page] += 1

		date_key = ts.strftime("%Y-%m-%d")
		event_daily_buckets[date_key]["day"] = DAY_LABELS[ts.weekday()]
		event_daily_buckets[date_key]["events"] += 1
		if row.get("user_id"):
			event_daily_buckets[date_key]["users"].add(row.get("user_id"))

	event_daily = [
		{
			"day": event_daily_buckets[key]["day"],
			"events": event_daily_buckets[key]["events"],
			"activeUsers": len(event_daily_buckets[key]["users"]),
		}
		for key in sorted(event_daily_buckets.keys())[-7:]
	]

	return {
		"kpis": {
			"totalTokens": total_tokens,
			"totalCost": round(total_cost, 4),
			"tokenGrowthPercent": token_growth,
			"activeUsers": current_active_users,
			"newUsersThisMonth": new_users_this_month,
			"avgQueriesPerDay": avg_queries_per_day,
		},
		"monthlyTokenUsage": monthly_usage,
		"dailyUsage": daily_usage,
		"activeUsers": active_users,
		"topUsers": top_users,
		"recentSessions": recent_sessions,
		"usageEventsSummary": {
			"eventTypeCounts": dict(sorted(event_type_counts.items(), key=lambda item: item[1], reverse=True)),
			"pageCounts": dict(sorted(page_counts.items(), key=lambda item: item[1], reverse=True)),
			"daily": event_daily,
		},
	}


def _serialize_recommendation(
	recommendation: dict[str, Any],
	diagnostic_test: dict[str, Any],
) -> dict[str, Any]:
	return {
		"id": recommendation.get("id"),
		"testId": recommendation.get("test_id"),
		"testName": diagnostic_test.get("name"),
		"category": diagnostic_test.get("category"),
		"title": recommendation.get("title"),
		"description": recommendation.get("description"),
		"impact": recommendation.get("impact"),
		"effort": recommendation.get("effort"),
		"status": recommendation.get("status"),
		"potentialImprovement": recommendation.get("potential_improvement"),
	}


def _recommendation_priority(status: Any) -> int:
	normalized = str(status or "").lower()
	if normalized == "in-progress":
		return 3
	if normalized == "open":
		return 2
	if normalized == "pending":
		return 1
	if normalized == "dismissed":
		return 0
	return 1


@router.get("/plans/{plan_id}/health-tests")
def get_plan_health_tests(
	plan_id: str,
) -> dict[str, Any]:
	if get_plan(plan_id) is None:
		raise HTTPException(status_code=404, detail="Plan not found")

	diagnostic_tests = get_diagnostic_tests()
	peer_benchmarks = get_peer_benchmarks()
	test_results = get_test_results(plan_id)
	recommendations = get_recommendations(plan_id)

	joined_tests: list[dict[str, Any]] = []
	filtered_test_ids: set[str] = set()

	recommendations_by_test_id = {
		recommendation.get("test_id"): recommendation
		for recommendation in recommendations
		if recommendation.get("test_id")
	}

	for test_result in test_results:
		test_id = test_result.get("test_id")
		diagnostic_test = diagnostic_tests.get(test_id)
		if not diagnostic_test:
			continue

		filtered_test_ids.add(test_id)
		recommendation = recommendations_by_test_id.get(test_id)
		benchmark_row = peer_benchmarks.get(test_id)
		joined_tests.append(
			{
				"id": diagnostic_test.get("diagnostic_tests_id"),
				"name": diagnostic_test.get("name"),
				"category": diagnostic_test.get("category"),
				"status": test_result.get("status"),
				"currentValue": _format_value(test_result.get("current_value")),
				"benchmark": _format_value(diagnostic_test.get("benchmark")),
				"description": diagnostic_test.get("description"),
				"recommendation": recommendation.get("description") if recommendation else None,
				"impact": diagnostic_test.get("impact"),
				"effort": diagnostic_test.get("effort"),
				"details": _build_test_details(test_result),
				"peerBenchmark": {
					"percentile": _build_percentile(test_result.get("numeric_value"), benchmark_row),
					"bottomQuartile": _format_value(benchmark_row.get("bottom_quartile")) if benchmark_row else None,
					"median": _format_value(benchmark_row.get("median")) if benchmark_row else None,
					"topQuartile": _format_value(benchmark_row.get("top_quartile")) if benchmark_row else None,
					"peerSet": _format_value(benchmark_row.get("peer_set")) if benchmark_row else None,
				},
			}
		)

	filtered_recommendations = []
	for recommendation in recommendations:
		test_id = recommendation.get("test_id")
		diagnostic_test = diagnostic_tests.get(test_id)
		if not diagnostic_test:
			continue
		if test_id not in filtered_test_ids:
			continue

		filtered_recommendations.append(_serialize_recommendation(recommendation, diagnostic_test))

	summary_source = [
		row
		for row in test_results
		if row.get("test_id") in filtered_test_ids
	]

	return {
		"diagnostic_tests": joined_tests,
		"recommendations": filtered_recommendations,
		"summary": _build_summary(summary_source),
	}


@router.get("/plans/{plan_id}/recommendations")
def get_plan_recommendations(
	plan_id: str,
	category: str | None = Query(default=None),
) -> dict[str, list[dict[str, Any]]]:
	if get_plan(plan_id) is None:
		raise HTTPException(status_code=404, detail="Plan not found")

	diagnostic_tests = get_diagnostic_tests()
	recommendations = get_recommendations(plan_id)

	result: list[dict[str, Any]] = []
	for recommendation in recommendations:
		test_id = recommendation.get("test_id")
		diagnostic_test = diagnostic_tests.get(test_id)
		if not diagnostic_test:
			continue
		if category and diagnostic_test.get("category") != category:
			continue

		result.append(_serialize_recommendation(recommendation, diagnostic_test))

	return {"recommendations": result}


@router.get("/plans/{plan_id}/documents")
def get_plan_documents(plan_id: str) -> dict[str, list[dict[str, Any]]]:
	if get_plan(plan_id) is None:
		raise HTTPException(status_code=404, detail="Plan not found")

	rows = get_documents(plan_id)
	documents = [
		{
			"id": row.get("id"),
			"planId": row.get("plan_id"),
			"name": row.get("name"),
			"type": _format_value(row.get("category")),
			"fileUrl": row.get("file_url"),
			"uploadedAt": row.get("uploaded_at"),
			"planYear": row.get("plan_year"),
		}
		for row in rows
	]

	return {"documents": documents}


@router.get("/plans/{plan_id}/campaigns")
def get_plan_campaigns(plan_id: str) -> dict[str, list[dict[str, Any]]]:
	if get_plan(plan_id) is None:
		raise HTTPException(status_code=404, detail="Plan not found")

	return {"campaigns": get_campaigns(plan_id)}


@router.get("/plans/{plan_id}/operations")
def get_plan_operations(plan_id: str) -> dict[str, list[dict[str, Any]]]:
	if get_plan(plan_id) is None:
		raise HTTPException(status_code=404, detail="Plan not found")

	diagnostic_tests = get_diagnostic_tests()
	test_results = get_test_results(plan_id)
	recommendations = get_recommendations(plan_id)

	latest_result_by_test_id: dict[str, dict[str, Any]] = {}
	for row in test_results:
		test_id = row.get("test_id")
		if not test_id:
			continue

		existing = latest_result_by_test_id.get(test_id)
		if existing is None:
			latest_result_by_test_id[test_id] = row
			continue

		existing_ts = _parse_iso_datetime(existing.get("as_of_date"))
		candidate_ts = _parse_iso_datetime(row.get("as_of_date"))
		if candidate_ts and (existing_ts is None or candidate_ts > existing_ts):
			latest_result_by_test_id[test_id] = row

	recommendation_by_test_id: dict[str, dict[str, Any]] = {}
	for recommendation in recommendations:
		test_id = recommendation.get("test_id")
		if not test_id:
			continue

		existing = recommendation_by_test_id.get(test_id)
		if existing is None or _recommendation_priority(recommendation.get("status")) > _recommendation_priority(existing.get("status")):
			recommendation_by_test_id[test_id] = recommendation

	operations_tests = []
	for diagnostic_test in diagnostic_tests.values():
		test_id = diagnostic_test.get("diagnostic_tests_id")
		test_result = latest_result_by_test_id.get(test_id) if test_id else None
		recommendation = recommendation_by_test_id.get(test_id) if test_id else None

		operations_tests.append(
			{
				**diagnostic_test,
				"status": test_result.get("status") if test_result else None,
				"currentValue": _format_value(test_result.get("current_value")) if test_result else None,
				"recommendation": recommendation.get("description") if recommendation else None,
			}
		)

	payroll_files = get_payroll_files(plan_id)

	return {
		"operations_tests": operations_tests,
		"payroll_files": payroll_files,
	}


@router.get("/usage")
def get_usage() -> dict[str, Any]:
	ai_rows = get_ai_interactions()
	usage_rows = get_usage_events()

	ai_interactions = [
		{
			"id": row.get("id"),
			"user_id": row.get("user_id"),
			"plan_id": row.get("plan_id"),
			"feature": row.get("feature"),
			"prompt": row.get("prompt"),
			"input_tokens": row.get("input_tokens"),
			"output_tokens": row.get("output_tokens"),
			"cost_usd": row.get("cost_usd"),
			"created_at": row.get("created_at"),
		}
		for row in ai_rows
	]

	usage_events = [
		{
			"id": row.get("id"),
			"user_id": row.get("user_id"),
			"event_type": row.get("event_type"),
			"page": row.get("page"),
			"occurred_at": row.get("occurred_at"),
		}
		for row in usage_rows
	]

	return {
		"ai_interactions": ai_interactions,
		"usage_events": usage_events,
		"analytics": _usage_analytics(ai_rows, usage_rows),
	}
