from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class UserSchema(BaseModel):
    id: str
    status: Optional[str]
    role: Optional[str]



class SponsorSchema(BaseModel):
    id: str
    name: str
    industry: Optional[str]
    employee_count_band: Optional[str]


class PlanSchema(BaseModel):
    plan_id: str
    sponsor_id: str
    name: str
    plan_type: Optional[str]
    effective_date: Optional[date]
    record_keeper: Optional[str]
    eligible_employees: Optional[int]
    total_participants: Optional[int]
    last_updated: Optional[datetime]



class ParticipantSchema(BaseModel):
    id: str
    plan_id: str
    status: Optional[str]
    hire_date: Optional[date]
    birth_date: Optional[date]
    compensation: Optional[Decimal]
    is_hce: Optional[bool]
    is_enrolled: Optional[bool]
    auto_enrolled: Optional[bool]
    auto_increase_opt_in: Optional[bool]


class ParticipantBalanceSchema(BaseModel):
    id: int
    participant_id: str
    as_of_date: date
    balance: Decimal
    vested_balance: Optional[Decimal]



class ContributionSchema(BaseModel):
    id: int
    participant_id: str
    payroll_date: date
    source: str
    amount: Decimal
    deferral_pct: Optional[Decimal]


class MatchFormulaSchema(BaseModel):
    plan_id: str
    formula_type: str
    match_pct: Optional[Decimal]
    match_cap_pct: Optional[Decimal]
    true_up: Optional[bool]


class InvestmentOptionSchema(BaseModel):
    id: str
    plan_id: str
    ticker: Optional[str]
    name: str
    asset_class: Optional[str]
    expense_ratio: Optional[Decimal]
    is_qdia: Optional[bool]


class ParticipantHoldingSchema(BaseModel):
    id: int
    participant_id: str
    investment_id: str
    as_of_date: date
    balance: Decimal
    allocation_pct: Optional[Decimal]


class LoanSchema(BaseModel):
    id: str
    participant_id: str
    issued_date: date
    principal: Decimal
    outstanding_balance: Decimal
    interest_rate: Optional[Decimal]
    status: str


class WithdrawalSchema(BaseModel):
    id: str
    participant_id: str
    withdrawal_date: date
    type: str
    amount: Decimal
    reason: Optional[str]


class DiagnosticTestSchema(BaseModel):
    id: str
    name: str
    category: Optional[str]
    description: Optional[str]
    benchmark: Optional[str]
    impact: Optional[str]
    effort: Optional[str]


class TestResultSchema(BaseModel):
    id: int
    plan_id: str
    test_id: str
    as_of_date: date
    status: str
    current_value: Optional[str]
    numeric_value: Optional[Decimal]


class PeerBenchmarkSchema(BaseModel):
    test_id: str
    peer_set: str
    bottom_quartile: Optional[str]
    median: Optional[str]
    top_quartile: Optional[str]


class RecommendationSchema(BaseModel):
    id: str
    plan_id: str
    test_id: str
    title: str
    description: Optional[str]
    impact: Optional[str]
    effort: Optional[str]
    status: Optional[str]
    potential_improvement: Optional[str]


class CallCenterEventSchema(BaseModel):
    id: int
    plan_id: str
    call_timestamp: datetime
    reason_code: Optional[str]
    duration_seconds: Optional[int]
    wait_seconds: Optional[int]
    resolved_first_call: Optional[bool]


class PayrollFileSchema(BaseModel):
    id: int
    plan_id: str
    received_at: datetime
    processed_at: Optional[datetime]
    status: str
    error_count: Optional[int]


class ComplianceFilingSchema(BaseModel):
    id: str
    plan_id: str
    filing_type: str
    plan_year: int
    due_date: date
    filed_date: Optional[date]
    status: str


class EducationCampaignSchema(BaseModel):
    id: str
    plan_ids: List[str]
    name: str
    type: Optional[str]
    topic: Optional[str]
    target_audience: Optional[str]
    date_launched: Optional[date]
    date_ended: Optional[date]
    participants_reached: Optional[int]
    engagement_rate: Optional[Decimal]
    status: Optional[str]


class DocumentSchema(BaseModel):
    id: str
    plan_id: str
    name: str
    category: Optional[str]
    file_url: str
    uploaded_at: datetime
    plan_year: Optional[int]


class AIInteractionSchema(BaseModel):
    id: str
    user_id: str
    plan_id: Optional[str]
    feature: Optional[str]
    prompt: Optional[str]
    response: Optional[str]
    input_tokens: Optional[int]
    output_tokens: Optional[int]
    cost_usd: Optional[Decimal]
    created_at: datetime



