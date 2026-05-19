from sqlalchemy import (
    Column, String, Integer, Boolean, Date, DateTime, Text,
    Numeric, ForeignKey, BigInteger, ARRAY
)
from sqlalchemy.orm import declarative_base
import uuid

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    status = Column(String(16))
    role = Column(String(32))


class Sponsor(Base):
    __tablename__ = "sponsors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    name = Column(String(255), nullable=False)
    industry = Column(String(64))
    employee_count_band = Column(String(32))


class Plan(Base):
    __tablename__ = "plans"

    plan_id = Column(String(32), primary_key=True)
    sponsor_id = Column(String(36), ForeignKey("sponsors.id"), nullable=False)
    name = Column(String(255), nullable=False)
    plan_type = Column(String(32))
    effective_date = Column(Date)
    record_keeper = Column(String(255))
    eligible_employees = Column(Integer)
    total_participants = Column(Integer)
    last_updated = Column(DateTime)




class Participant(Base):
    __tablename__ = "participants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    plan_id = Column(String(32), ForeignKey("plans.plan_id"), nullable=False)
    status = Column(String(16))
    hire_date = Column(Date)
    birth_date = Column(Date)
    compensation = Column(Numeric(12, 2))
    is_hce = Column(Boolean, default=False)
    is_enrolled = Column(Boolean, default=False)
    auto_enrolled = Column(Boolean, default=False)
    auto_increase_opt_in = Column(Boolean, default=False)



class ParticipantBalance(Base):
    __tablename__ = "participant_balances"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    participant_id = Column(String(36), ForeignKey("participants.id"), nullable=False)
    as_of_date = Column(Date, nullable=False)
    balance = Column(Numeric(14, 2), nullable=False)
    vested_balance = Column(Numeric(14, 2))

  


class Contribution(Base):
    __tablename__ = "contributions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    participant_id = Column(String(36), ForeignKey("participants.id"), nullable=False)
    payroll_date = Column(Date, nullable=False)
    source = Column(String(24), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    deferral_pct = Column(Numeric(5, 2))

  


class MatchFormula(Base):
    __tablename__ = "match_formulas"

    plan_id = Column(String(32), ForeignKey("plans.plan_id"), primary_key=True)
    formula_type = Column(String(32), nullable=False)
    match_pct = Column(Numeric(5, 2))
    match_cap_pct = Column(Numeric(5, 2))
    true_up = Column(Boolean, default=False)

 


class InvestmentOption(Base):
    __tablename__ = "investment_options"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    plan_id = Column(String(32), ForeignKey("plans.plan_id"), nullable=False)
    ticker = Column(String(16))
    name = Column(String(255), nullable=False)
    asset_class = Column(String(32))
    expense_ratio = Column(Numeric(6, 4))
    is_qdia = Column(Boolean, default=False)



class ParticipantHolding(Base):
    __tablename__ = "participant_holdings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    participant_id = Column(String(36), ForeignKey("participants.id"), nullable=False)
    investment_id = Column(String(36), ForeignKey("investment_options.id"), nullable=False)
    as_of_date = Column(Date, nullable=False)
    balance = Column(Numeric(14, 2), nullable=False)
    allocation_pct = Column(Numeric(5, 2))



class Loan(Base):
    __tablename__ = "loans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    participant_id = Column(String(36), ForeignKey("participants.id"), nullable=False)
    issued_date = Column(Date, nullable=False)
    principal = Column(Numeric(12, 2), nullable=False)
    outstanding_balance = Column(Numeric(12, 2), nullable=False)
    interest_rate = Column(Numeric(5, 3))
    status = Column(String(16), nullable=False)

   


class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    participant_id = Column(String(36), ForeignKey("participants.id"), nullable=False)
    withdrawal_date = Column(Date, nullable=False)
    type = Column(String(24), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    reason = Column(String(64))




class DiagnosticTest(Base):
    __tablename__ = "diagnostic_tests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    name = Column(String(128), nullable=False)
    category = Column(String(24))
    description = Column(Text)
    benchmark = Column(String(32))
    impact = Column(String(8))
    effort = Column(String(8))


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    plan_id = Column(String(32), ForeignKey("plans.plan_id"), nullable=False)
    test_id = Column(String(64), ForeignKey("diagnostic_tests.id"), nullable=False)
    as_of_date = Column(Date, nullable=False)
    status = Column(String(8), nullable=False)
    current_value = Column(String(32))
    numeric_value = Column(Numeric(14, 4))


class PeerBenchmark(Base):
    __tablename__ = "peer_benchmarks"

    test_id = Column(String(64), ForeignKey("diagnostic_tests.id"), primary_key=True)
    peer_set = Column(String(64), primary_key=True)
    bottom_quartile = Column(String(32))
    median = Column(String(32))
    top_quartile = Column(String(32))


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    plan_id = Column(String(32), ForeignKey("plans.plan_id"), nullable=False)
    test_id = Column(String(64), ForeignKey("diagnostic_tests.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    impact = Column(String(8))
    effort = Column(String(8))
    status = Column(String(16))
    potential_improvement = Column(String(64))



class CallCenterEvent(Base):
    __tablename__ = "call_center_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    plan_id = Column(String(32), ForeignKey("plans.plan_id"), nullable=False)
    call_timestamp = Column(DateTime, nullable=False)
    reason_code = Column(String(32))
    duration_seconds = Column(Integer)
    wait_seconds = Column(Integer)
    resolved_first_call = Column(Boolean)


class PayrollFile(Base):
    __tablename__ = "payroll_files"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    plan_id = Column(String(32), ForeignKey("plans.plan_id"), nullable=False)
    received_at = Column(DateTime, nullable=False)
    processed_at = Column(DateTime)
    status = Column(String(16), nullable=False)
    error_count = Column(Integer, default=0)


class ComplianceFiling(Base):
    __tablename__ = "compliance_filings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    plan_id = Column(String(32), ForeignKey("plans.plan_id"), nullable=False)
    filing_type = Column(String(32), nullable=False)
    plan_year = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    filed_date = Column(Date)
    status = Column(String(16), nullable=False)


class EducationCampaign(Base):
    __tablename__ = "education_campaigns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    plan_ids = Column(ARRAY(String(32)), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(24))
    topic = Column(String(64))
    target_audience = Column(String(255))
    date_launched = Column(Date)
    date_ended = Column(Date)
    participants_reached = Column(Integer)
    engagement_rate = Column(Numeric(5, 2))
    status = Column(String(16))


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    plan_id = Column(String(32), ForeignKey("plans.plan_id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(32))
    file_url = Column(Text, nullable=False)
    uploaded_at = Column(DateTime, nullable=False)
    plan_year = Column(Integer)


class AIInteraction(Base):
    __tablename__ = "ai_interactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4))
    user_id = Column(String(36), nullable=False)
    plan_id = Column(String(32))
    feature = Column(String(32))
    prompt = Column(Text)
    response = Column(Text)
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    cost_usd = Column(Numeric(10, 4))
    created_at = Column(DateTime, nullable=False)
