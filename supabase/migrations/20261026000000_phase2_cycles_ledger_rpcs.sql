-- ==============================================================================
-- Gym Manager Phase 2: Cycles, Append-Only Ledger, Idempotency & Secure RPCs
-- Safe, additive migration preserving all existing member records and functionality
-- ==============================================================================

begin;

-- 0. Ensure pgcrypto extension is active for digest() SHA-256 payload hashing
create extension if not exists pgcrypto with schema extensions;


-- 1. Dual-Tier Safety: Fast in-database snapshot of existing records
-- Preserves existing baseline recovery snapshot if already present; creates initial backup safely
create table if not exists public._backup_members_phase2 as select * from public.members;
create table if not exists public._backup_gyms_phase2 as select * from public.gyms;



-- 2. Add composite candidate key on public.members for referential integrity
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'members_gym_id_id_unique'
  ) then
    alter table public.members add constraint members_gym_id_id_unique unique (gym_id, id);
  end if;
end $$;

-- 3. Idempotency Keys Table (Transaction-safe deduplication)
create table if not exists public.idempotency_keys (
  gym_id uuid not null references public.gyms (id) on delete restrict,
  idempotency_key text not null check (length(trim(idempotency_key)) > 0),
  operation text not null check (operation in ('renewal', 'payment', 'refund_reversal')),
  payload_hash text not null,
  status text not null default 'started' check (status in ('started', 'completed')),
  response_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (gym_id, idempotency_key)
);

create index if not exists idx_idempotency_lookup on public.idempotency_keys (gym_id, idempotency_key);

-- 4. Member Cycles Table (Contractual billing periods and arrears novation)
create table if not exists public.member_cycles (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  member_id uuid not null,
  cycle_number integer not null check (cycle_number >= 1),
  plan_name text not null check (length(trim(plan_name)) > 0),
  start_date date not null,
  end_date date not null,
  plan_fee numeric(10, 2) not null check (plan_fee >= 0),
  carried_arrears numeric(10, 2) not null default 0.00 check (carried_arrears >= 0),
  gross_payable numeric(10, 2) generated always as (plan_fee + carried_arrears) stored,
  paid_amount numeric(10, 2) not null default 0.00 check (paid_amount >= 0),
  transferred_arrears numeric(10, 2) not null default 0.00 check (transferred_arrears >= 0),
  outstanding_due numeric(10, 2) not null default 0.00 check (outstanding_due >= 0),
  is_current boolean not null default true,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Foreign key ensuring member belongs to same gym
  constraint fk_member_cycles_member foreign key (gym_id, member_id)
    references public.members (gym_id, id) on delete restrict,

  constraint chk_member_cycles_dates check (end_date >= start_date),
  constraint uq_member_cycles_gym_member_cycle unique (gym_id, member_id, id),
  constraint uq_member_cycles_sequence unique (member_id, cycle_number),

  -- Invariant: gross_payable must exactly equal paid_amount + transferred_arrears + outstanding_due
  constraint chk_member_cycles_balance_math check (gross_payable = paid_amount + transferred_arrears + outstanding_due),
  constraint chk_member_cycles_current_status check (
    (is_current = true and status = 'active' and transferred_arrears = 0.00) or
    (is_current = false and status in ('completed', 'cancelled', 'expired'))
  )
);

create unique index if not exists uq_member_cycles_single_current 
  on public.member_cycles (member_id) 
  where (is_current = true);

create index if not exists idx_member_cycles_lookup 
  on public.member_cycles (gym_id, member_id, is_current);

-- 5. Payment Transactions Ledger (Append-only immutable financial records)
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  member_id uuid not null,
  cycle_id uuid not null,
  transaction_type text not null check (transaction_type in ('payment', 'refund', 'reversal', 'legacy_opening')),
  amount numeric(10, 2) not null check (amount > 0),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'upi', 'card', 'bank_transfer', 'legacy')),
  original_payment_id uuid,
  idempotency_key text,
  payload_hash text,
  notes text not null default '',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),

  constraint fk_payment_transactions_cycle foreign key (gym_id, member_id, cycle_id)
    references public.member_cycles (gym_id, member_id, id) on delete restrict,

  constraint fk_payment_transactions_original foreign key (gym_id, member_id, cycle_id, original_payment_id)
    references public.payment_transactions (gym_id, member_id, cycle_id, id) on delete restrict,

  constraint uq_payment_transactions_hierarchy unique (gym_id, member_id, cycle_id, id),

  constraint chk_payment_transactions_adjustment check (
    (transaction_type in ('refund', 'reversal') and original_payment_id is not null) or
    (transaction_type in ('payment', 'legacy_opening') and original_payment_id is null)
  )
);

create unique index if not exists uq_payment_transactions_idempotency 
  on public.payment_transactions (gym_id, idempotency_key) 
  where (idempotency_key is not null);

create index if not exists idx_payment_transactions_orig 
  on public.payment_transactions (original_payment_id) 
  where (original_payment_id is not null);

create index if not exists idx_payment_transactions_cycle_agg 
  on public.payment_transactions (cycle_id, transaction_type);

-- 6. Member Renewals Audit Log
create table if not exists public.member_renewals (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  member_id uuid not null,
  previous_cycle_id uuid,
  new_cycle_id uuid not null,
  plan_name text not null check (length(trim(plan_name)) > 0),
  start_date date not null,
  end_date date not null,
  plan_fee numeric(10, 2) not null check (plan_fee >= 0),
  carried_arrears numeric(10, 2) not null default 0.00 check (carried_arrears >= 0),
  down_payment numeric(10, 2) not null default 0.00 check (down_payment >= 0),
  payment_method text not null default 'cash',
  idempotency_key text,
  payload_hash text,
  created_at timestamptz not null default now(),

  constraint fk_member_renewals_member foreign key (gym_id, member_id)
    references public.members (gym_id, id) on delete restrict,

  constraint fk_member_renewals_prev_cycle foreign key (gym_id, member_id, previous_cycle_id)
    references public.member_cycles (gym_id, member_id, id) on delete restrict,

  constraint fk_member_renewals_new_cycle foreign key (gym_id, member_id, new_cycle_id)
    references public.member_cycles (gym_id, member_id, id) on delete restrict,

  constraint chk_member_renewals_dates check (end_date >= start_date)
);

create unique index if not exists uq_member_renewals_idempotency 
  on public.member_renewals (gym_id, idempotency_key) 
  where (idempotency_key is not null);

-- 7. Legacy Quarantine Isolation Table
create table if not exists public._legacy_members_quarantine (
  id uuid primary key,
  gym_id uuid,
  name text,
  total_fee numeric,
  paid_amount numeric,
  start_date date,
  end_date date,
  rejection_reason text,
  quarantined_at timestamptz default now()
);

-- ==============================================================================
-- 8. Authoritative Recalculator Engine (Internal Security Definer)
-- ==============================================================================
create or replace function public.recalculate_member_cycle_balance(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cycle public.member_cycles%rowtype;
  v_payments numeric(10, 2);
  v_adjustments numeric(10, 2);
  v_legacy numeric(10, 2);
  v_net_paid numeric(10, 2);
  v_new_due numeric(10, 2);
begin
  select * into v_cycle
  from public.member_cycles
  where id = p_cycle_id
  for update;

  if not found then
    raise exception 'Invariant error: Cycle % not found.', p_cycle_id;
  end if;

  select coalesce(sum(amount), 0.00) into v_payments
  from public.payment_transactions
  where cycle_id = p_cycle_id and transaction_type = 'payment';

  select coalesce(sum(amount), 0.00) into v_adjustments
  from public.payment_transactions
  where cycle_id = p_cycle_id and transaction_type in ('refund', 'reversal');

  select coalesce(sum(amount), 0.00) into v_legacy
  from public.payment_transactions
  where cycle_id = p_cycle_id and transaction_type = 'legacy_opening';

  v_net_paid := (v_payments + v_legacy) - v_adjustments;

  if v_net_paid < 0.00 then
    raise exception 'Integrity violation: Net paid (₹%) cannot be negative in cycle %.', v_net_paid, p_cycle_id;
  end if;

  if (v_net_paid + v_cycle.transferred_arrears) > v_cycle.gross_payable then
    raise exception 'Integrity violation: Net paid (₹%) + transferred arrears (₹%) exceeds gross payable (₹%) in cycle %.',
      v_net_paid, v_cycle.transferred_arrears, v_cycle.gross_payable, p_cycle_id;
  end if;

  v_new_due := v_cycle.gross_payable - v_net_paid - v_cycle.transferred_arrears;

  update public.member_cycles
  set paid_amount = v_net_paid,
      outstanding_due = v_new_due,
      updated_at = now()
  where id = p_cycle_id;

  -- Synchronize public.members cached snapshot if this cycle is active
  if v_cycle.is_current = true then
    update public.members
    set total_fee = v_cycle.gross_payable,
        paid_amount = v_net_paid,
        plan = v_cycle.plan_name,
        start_date = v_cycle.start_date,
        end_date = v_cycle.end_date
    where id = v_cycle.member_id and gym_id = v_cycle.gym_id;
  end if;
end;
$$;

revoke all on function public.recalculate_member_cycle_balance(uuid) from public, anon, authenticated;

-- ==============================================================================
-- 9. Authoritative Payment Recording RPC
-- ==============================================================================
create or replace function public.rpc_record_payment(
  p_member_id uuid,
  p_amount numeric(10, 2),
  p_payment_method text,
  p_notes text default '',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_gym_id uuid;
  v_member public.members%rowtype;
  v_cycle public.member_cycles%rowtype;
  v_tx_id uuid;
  v_payload_hash text;
  v_existing_key public.idempotency_keys%rowtype;
  v_new_due numeric(10, 2);
  v_result jsonb;
begin
  if p_member_id is null or p_amount is null then
    raise exception 'Member ID and amount must not be null.';
  end if;

  if p_amount <= 0.00 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  if p_payment_method not in ('cash', 'upi', 'card', 'bank_transfer') then
    raise exception 'Invalid payment method: %.', p_payment_method;
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'Non-empty idempotency key is required for financial mutations.';
  end if;

  -- Lock Hierarchy Level 1: Lock Member and verify gym ownership directly
  select * into v_member
  from public.members
  where id = p_member_id
  for update;

  if not found then
    raise exception 'Member % not found.', p_member_id;
  end if;

  v_gym_id := v_member.gym_id;

  if v_gym_id <> auth.uid() or not public.is_active_gym() then
    raise exception 'Unauthorized: Caller does not own gym % or gym is inactive.', v_gym_id;
  end if;

  -- Canonical Payload Fingerprint
  v_payload_hash := encode(digest(
    jsonb_build_object(
      'member_id', p_member_id,
      'amount', p_amount,
      'payment_method', p_payment_method,
      'notes', trim(coalesce(p_notes, ''))
    )::text, 'sha256'), 'hex');

  -- Pre-Mutation Idempotency Serialization
  loop
    select * into v_existing_key
    from public.idempotency_keys
    where gym_id = v_gym_id and idempotency_key = p_idempotency_key
    for update;

    if found then
      if v_existing_key.operation <> 'payment' or v_existing_key.payload_hash <> v_payload_hash then
        raise exception '409 Conflict: Idempotency key reused with mismatched operation or payload.';
      end if;
      if v_existing_key.status = 'completed' then
        return v_existing_key.response_payload;
      end if;
      raise exception '409 Conflict: Concurrent request currently processing this idempotency key.';
    else
      begin
        insert into public.idempotency_keys (
          gym_id, idempotency_key, operation, payload_hash, status
        ) values (
          v_gym_id, p_idempotency_key, 'payment', v_payload_hash, 'started'
        );
        exit;
      exception when unique_violation then
      end;
    end if;
  end loop;

  -- Lock Hierarchy Level 2: Lock Current Cycle
  select * into v_cycle
  from public.member_cycles
  where member_id = p_member_id and gym_id = v_gym_id and is_current = true
  for update;

  if not found then
    raise exception 'No active current cycle found for member %.', p_member_id;
  end if;

  if p_amount > v_cycle.outstanding_due then
    raise exception 'Payment amount (₹%) exceeds current outstanding due (₹%). Overpayment is prohibited.',
      p_amount, v_cycle.outstanding_due;
  end if;

  insert into public.payment_transactions (
    gym_id, member_id, cycle_id, transaction_type,
    amount, payment_method, notes,
    idempotency_key, payload_hash
  ) values (
    v_gym_id, p_member_id, v_cycle.id, 'payment',
    p_amount, p_payment_method, trim(coalesce(p_notes, '')),
    p_idempotency_key, v_payload_hash
  ) returning id into v_tx_id;

  perform public.recalculate_member_cycle_balance(v_cycle.id);

  select outstanding_due into v_new_due
  from public.member_cycles
  where id = v_cycle.id;

  v_result := jsonb_build_object(
    'success', true,
    'replayed', false,
    'transaction_id', v_tx_id,
    'cycle_id', v_cycle.id,
    'amount_paid', p_amount,
    'remaining_due', v_new_due
  );

  update public.idempotency_keys
  set status = 'completed',
      response_payload = v_result,
      updated_at = now()
  where gym_id = v_gym_id and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

revoke all on function public.rpc_record_payment from public, anon;
grant execute on function public.rpc_record_payment to authenticated;

-- ==============================================================================
-- 10. Authoritative Renewal RPC with Expired-Member Arrears Novation
-- ==============================================================================
create or replace function public.rpc_renew_membership(
  p_member_id uuid,
  p_plan_name text,
  p_start_date date,
  p_end_date date,
  p_plan_fee numeric(10, 2),
  p_down_payment numeric(10, 2) default 0.00,
  p_payment_method text default 'cash',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_gym_id uuid;
  v_member public.members%rowtype;
  v_latest_cycle public.member_cycles%rowtype;
  v_new_cycle_id uuid;
  v_renewal_id uuid;
  v_next_seq integer;
  v_carried_arrears numeric(10, 2) := 0.00;
  v_payload_hash text;
  v_existing_key public.idempotency_keys%rowtype;
  v_result jsonb;
  v_active_count integer;
begin
  if p_member_id is null or p_start_date is null or p_end_date is null then
    raise exception 'Member ID, start date, and end date must not be null.';
  end if;

  if length(trim(coalesce(p_plan_name, ''))) = 0 then
    raise exception 'Plan name cannot be blank.';
  end if;

  if p_plan_fee < 0.00 or p_down_payment < 0.00 then
    raise exception 'Fees and down payments must be non-negative.';
  end if;

  if p_end_date < p_start_date then
    raise exception 'End date cannot precede start date.';
  end if;

  if p_down_payment > 0 and p_payment_method not in ('cash', 'upi', 'card', 'bank_transfer') then
    raise exception 'Invalid payment method: %.', p_payment_method;
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'Non-empty idempotency key is required for financial mutations.';
  end if;

  -- Lock Hierarchy Level 1: Lock Member and verify gym ownership directly
  select * into v_member
  from public.members
  where id = p_member_id
  for update;

  if not found then
    raise exception 'Member % not found.', p_member_id;
  end if;

  v_gym_id := v_member.gym_id;

  if v_gym_id <> auth.uid() or not public.is_active_gym() then
    raise exception 'Unauthorized: Caller does not own gym % or gym is inactive.', v_gym_id;
  end if;

  -- Canonical Payload Fingerprint
  v_payload_hash := encode(digest(
    jsonb_build_object(
      'member_id', p_member_id,
      'plan_name', trim(p_plan_name),
      'start_date', p_start_date,
      'end_date', p_end_date,
      'plan_fee', p_plan_fee,
      'down_payment', p_down_payment,
      'payment_method', p_payment_method
    )::text, 'sha256'), 'hex');

  -- Pre-Mutation Idempotency Serialization
  loop
    select * into v_existing_key
    from public.idempotency_keys
    where gym_id = v_gym_id and idempotency_key = p_idempotency_key
    for update;

    if found then
      if v_existing_key.operation <> 'renewal' or v_existing_key.payload_hash <> v_payload_hash then
        raise exception '409 Conflict: Idempotency key reused with mismatched operation or payload.';
      end if;
      if v_existing_key.status = 'completed' then
        return v_existing_key.response_payload;
      end if;
      raise exception '409 Conflict: Concurrent request currently processing this idempotency key.';
    else
      begin
        insert into public.idempotency_keys (
          gym_id, idempotency_key, operation, payload_hash, status
        ) values (
          v_gym_id, p_idempotency_key, 'renewal', v_payload_hash, 'started'
        );
        exit;
      exception when unique_violation then
      end;
    end if;
  end loop;

  -- Lock Hierarchy Level 2: Lock and Inspect Most Recent Cycle
  select count(*) into v_active_count
  from public.member_cycles
  where member_id = p_member_id and gym_id = v_gym_id and is_current = true;

  if v_active_count > 1 then
    raise exception 'Invariant corruption: Member % has % active current cycles.', p_member_id, v_active_count;
  end if;

  select * into v_latest_cycle
  from public.member_cycles
  where member_id = p_member_id and gym_id = v_gym_id
  order by cycle_number desc
  limit 1
  for update;

  if found then
    perform public.recalculate_member_cycle_balance(v_latest_cycle.id);
    select * into v_latest_cycle from public.member_cycles where id = v_latest_cycle.id;

    v_carried_arrears := v_latest_cycle.outstanding_due;
    v_next_seq := v_latest_cycle.cycle_number + 1;

    -- Novate arrears: transfer closing due out of previous cycle into new cycle
    update public.member_cycles
    set is_current = false,
        status = 'completed',
        transferred_arrears = transferred_arrears + v_carried_arrears,
        outstanding_due = 0.00,
        updated_at = now()
    where id = v_latest_cycle.id;
  else
    v_next_seq := 1;
    v_carried_arrears := 0.00;
  end if;

  if p_down_payment > (p_plan_fee + v_carried_arrears) then
    raise exception 'Down payment (₹%) exceeds total payable (₹%).',
      p_down_payment, (p_plan_fee + v_carried_arrears);
  end if;

  -- Create New Active Cycle
  insert into public.member_cycles (
    gym_id, member_id, cycle_number, plan_name,
    start_date, end_date, plan_fee, carried_arrears,
    paid_amount, transferred_arrears, outstanding_due,
    is_current, status
  ) values (
    v_gym_id, p_member_id, v_next_seq, trim(p_plan_name),
    p_start_date, p_end_date, p_plan_fee, v_carried_arrears,
    0.00, 0.00, (p_plan_fee + v_carried_arrears),
    true, 'active'
  ) returning id into v_new_cycle_id;

  -- Record Down Payment (if > 0)
  if p_down_payment > 0 then
    insert into public.payment_transactions (
      gym_id, member_id, cycle_id, transaction_type,
      amount, payment_method, notes
    ) values (
      v_gym_id, p_member_id, v_new_cycle_id, 'payment',
      p_down_payment, p_payment_method, 'Renewal down payment'
    );
  end if;

  -- Record Renewal Audit Entry
  insert into public.member_renewals (
    gym_id, member_id, previous_cycle_id, new_cycle_id,
    plan_name, start_date, end_date, plan_fee,
    carried_arrears, down_payment, payment_method,
    idempotency_key, payload_hash
  ) values (
    v_gym_id, p_member_id, v_latest_cycle.id, v_new_cycle_id,
    trim(p_plan_name), p_start_date, p_end_date, p_plan_fee,
    v_carried_arrears, p_down_payment, p_payment_method,
    p_idempotency_key, v_payload_hash
  ) returning id into v_renewal_id;

  perform public.recalculate_member_cycle_balance(v_new_cycle_id);

  v_result := jsonb_build_object(
    'success', true,
    'replayed', false,
    'renewal_id', v_renewal_id,
    'cycle_id', v_new_cycle_id,
    'carried_arrears', v_carried_arrears,
    'gross_payable', (p_plan_fee + v_carried_arrears),
    'down_payment', p_down_payment
  );

  update public.idempotency_keys
  set status = 'completed',
      response_payload = v_result,
      updated_at = now()
  where gym_id = v_gym_id and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

revoke all on function public.rpc_renew_membership from public, anon;
grant execute on function public.rpc_renew_membership to authenticated;

-- ==============================================================================
-- 11. Authoritative Refund & Reversal RPC with Closed-Cycle Propagation
-- ==============================================================================
create or replace function public.rpc_process_refund_reversal(
  p_original_payment_id uuid,
  p_transaction_type text,
  p_amount numeric(10, 2),
  p_notes text,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_gym_id uuid;
  v_orig public.payment_transactions%rowtype;
  v_member public.members%rowtype;
  v_orig_cycle public.member_cycles%rowtype;
  v_current_cycle public.member_cycles%rowtype;
  v_tx_id uuid;
  v_prior_refunds numeric(10, 2);
  v_payload_hash text;
  v_existing_key public.idempotency_keys%rowtype;
  v_result jsonb;
begin
  if p_original_payment_id is null or p_amount is null then
    raise exception 'Original payment ID and amount must not be null.';
  end if;

  if p_amount <= 0.00 then
    raise exception 'Refund amount must be greater than zero.';
  end if;

  if p_transaction_type not in ('refund', 'reversal') then
    raise exception 'Transaction type must be refund or reversal.';
  end if;

  if length(trim(coalesce(p_notes, ''))) = 0 then
    raise exception 'Notes/reason required for refund or reversal.';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'Non-empty idempotency key is required for financial mutations.';
  end if;

  -- Lock Member (Level 1) and verify gym ownership directly
  select m.* into v_member
  from public.payment_transactions p
  join public.members m on m.id = p.member_id and m.gym_id = p.gym_id
  where p.id = p_original_payment_id
  for update of m;

  if not found then
    raise exception 'Original payment % not found.', p_original_payment_id;
  end if;

  v_gym_id := v_member.gym_id;

  if v_gym_id <> auth.uid() or not public.is_active_gym() then
    raise exception 'Unauthorized: Caller does not own gym % or gym is inactive.', v_gym_id;
  end if;

  v_payload_hash := encode(digest(
    jsonb_build_object(
      'original_payment_id', p_original_payment_id,
      'transaction_type', p_transaction_type,
      'amount', p_amount,
      'notes', trim(p_notes)
    )::text, 'sha256'), 'hex');

  -- Pre-Mutation Idempotency
  loop
    select * into v_existing_key
    from public.idempotency_keys
    where gym_id = v_gym_id and idempotency_key = p_idempotency_key
    for update;

    if found then
      if v_existing_key.operation <> 'refund_reversal' or v_existing_key.payload_hash <> v_payload_hash then
        raise exception '409 Conflict: Idempotency key reused with mismatched operation or payload.';
      end if;
      if v_existing_key.status = 'completed' then
        return v_existing_key.response_payload;
      end if;
      raise exception '409 Conflict: Concurrent request currently processing this idempotency key.';
    else
      begin
        insert into public.idempotency_keys (
          gym_id, idempotency_key, operation, payload_hash, status
        ) values (
          v_gym_id, p_idempotency_key, 'refund_reversal', v_payload_hash, 'started'
        );
        exit;
      exception when unique_violation then
      end;
    end if;
  end loop;

  -- Lock Original Cycle (Level 2)
  select * into v_orig_cycle
  from public.member_cycles
  where id = (select cycle_id from public.payment_transactions where id = p_original_payment_id)
  for update;

  -- Lock Original Payment Row Exclusively (Level 3)
  select * into v_orig
  from public.payment_transactions
  where id = p_original_payment_id and gym_id = v_gym_id
  for update;

  if v_orig.transaction_type <> 'payment' then
    raise exception 'Cannot refund/reverse a % transaction.', v_orig.transaction_type;
  end if;

  -- Enforce Refund Cap Under Exclusive Lock
  select coalesce(sum(amount), 0.00) into v_prior_refunds
  from public.payment_transactions
  where original_payment_id = v_orig.id
    and transaction_type in ('refund', 'reversal');

  if (v_prior_refunds + p_amount) > v_orig.amount then
    raise exception 'Refund amount (₹%) exceeds remaining refundable balance (₹%). Original: ₹%, Prior refunds: ₹%.',
      p_amount, (v_orig.amount - v_prior_refunds), v_orig.amount, v_prior_refunds;
  end if;

  insert into public.payment_transactions (
    gym_id, member_id, cycle_id, transaction_type,
    amount, payment_method, original_payment_id,
    notes, idempotency_key, payload_hash
  ) values (
    v_gym_id, v_orig.member_id, v_orig.cycle_id, p_transaction_type,
    p_amount, v_orig.payment_method, v_orig.id,
    trim(p_notes), p_idempotency_key, v_payload_hash
  ) returning id into v_tx_id;

  -- Recalculate target cycle and propagate historical arrears if needed
  if v_orig_cycle.is_current = false then
    select * into v_current_cycle
    from public.member_cycles
    where member_id = v_orig.member_id and gym_id = v_gym_id and is_current = true
    for update;

    if found then
      -- Propagate debt forward to active cycle:
      -- 1) In closed cycle: shift paid_amount to transferred_arrears while keeping balance math intact
      update public.member_cycles
      set paid_amount = paid_amount - p_amount,
          transferred_arrears = transferred_arrears + p_amount,
          updated_at = now()
      where id = v_orig_cycle.id;

      -- 2) In active cycle: increment carried_arrears and outstanding_due simultaneously to match generated gross_payable
      update public.member_cycles
      set carried_arrears = carried_arrears + p_amount,
          outstanding_due = outstanding_due + p_amount,
          updated_at = now()
      where id = v_current_cycle.id;

      -- 3) Run authoritative recalculation on both cycles to finalize exact ledger state
      perform public.recalculate_member_cycle_balance(v_orig_cycle.id);
      perform public.recalculate_member_cycle_balance(v_current_cycle.id);
    else
      -- Historical cycle with no active cycle: recalculate directly; debt remains on closed cycle as outstanding_due
      perform public.recalculate_member_cycle_balance(v_orig_cycle.id);
    end if;
  else
    -- Current cycle refund: recalculate directly
    perform public.recalculate_member_cycle_balance(v_orig.cycle_id);
  end if;

  v_result := jsonb_build_object(
    'success', true,
    'replayed', false,
    'adjustment_id', v_tx_id,
    'original_payment_id', v_orig.id,
    'amount', p_amount,
    'type', p_transaction_type
  );

  update public.idempotency_keys
  set status = 'completed',
      response_payload = v_result,
      updated_at = now()
  where gym_id = v_gym_id and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

revoke all on function public.rpc_process_refund_reversal from public, anon;
grant execute on function public.rpc_process_refund_reversal to authenticated;

-- ==============================================================================
-- 12. Automated Baseline Cycle 1 Creation on New Member Inserts
-- ==============================================================================
create or replace function public.trg_init_new_member_cycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cycle_id uuid;
  v_is_active boolean;
begin
  v_is_active := (new.end_date >= current_date);

  insert into public.member_cycles (
    gym_id, member_id, cycle_number, plan_name,
    start_date, end_date, plan_fee, carried_arrears,
    paid_amount, transferred_arrears, outstanding_due,
    is_current, status, created_at, updated_at
  ) values (
    new.gym_id, new.id, 1,
    coalesce(nullif(trim(new.plan), ''), 'Standard Plan'),
    new.start_date, new.end_date, new.total_fee, 0.00,
    new.paid_amount, 0.00,
    greatest(0.00, new.total_fee - new.paid_amount),
    v_is_active,
    case when v_is_active then 'active' else 'completed' end,
    new.created_at, new.created_at
  ) returning id into v_cycle_id;

  if new.paid_amount > 0 then
    insert into public.payment_transactions (
      gym_id, member_id, cycle_id, transaction_type,
      amount, payment_method, notes, created_at
    ) values (
      new.gym_id, new.id, v_cycle_id, 'payment',
      new.paid_amount, 'cash',
      'Initial membership payment', new.created_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_members_after_insert_cycle on public.members;
create trigger trg_members_after_insert_cycle
  after insert on public.members
  for each row execute function public.trg_init_new_member_cycle();

-- ==============================================================================
-- 13. Resumable Legacy Migration & Quarantine Engine
-- ==============================================================================
create or replace function public.migrate_legacy_member_balances(p_dry_run boolean default true)
returns table (
  member_id uuid,
  member_name text,
  status text,
  issue text,
  legacy_fee numeric,
  legacy_paid numeric,
  legacy_due numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_cycle_id uuid;
  v_due numeric(10, 2);
  v_reason text;
  v_is_active boolean;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Administrator access required.';
  end if;

  if not pg_try_advisory_xact_lock(hashtext('migrate_legacy_member_balances')) then
    raise exception 'Migration currently running in another session.';
  end if;

  for r in (
    select m.*
    from public.members m
    where not exists (
      select 1 from public.member_cycles c where c.member_id = m.id
    )
    order by m.created_at asc
  ) loop
    v_reason := null;

    if r.total_fee is null or r.paid_amount is null then
      v_reason := 'Null total_fee or paid_amount';
    elsif r.total_fee < 0.00 or r.paid_amount < 0.00 then
      v_reason := 'Negative total_fee or paid_amount';
    elsif r.paid_amount > r.total_fee then
      v_reason := 'Paid amount exceeds total fee';
    elsif r.start_date is null or r.end_date is null then
      v_reason := 'Missing start or end date';
    elsif r.end_date < r.start_date then
      v_reason := 'End date precedes start date';
    elsif length(trim(coalesce(r.plan, ''))) = 0 then
      v_reason := 'Blank or missing plan';
    end if;

    if v_reason is not null then
      member_id := r.id;
      member_name := r.name;
      status := 'quarantined';
      issue := v_reason;
      legacy_fee := r.total_fee;
      legacy_paid := r.paid_amount;
      legacy_due := r.total_fee - r.paid_amount;
      return next;

      if not p_dry_run then
        insert into public._legacy_members_quarantine (
          id, gym_id, name, total_fee, paid_amount, start_date, end_date, rejection_reason
        ) values (
          r.id, r.gym_id, r.name, r.total_fee, r.paid_amount, r.start_date, r.end_date, v_reason
        ) on conflict (id) do update set rejection_reason = excluded.rejection_reason;
      end if;
      continue;
    end if;

    v_due := r.total_fee - r.paid_amount;
    v_is_active := (r.end_date >= current_date);

    member_id := r.id;
    member_name := r.name;
    status := 'valid';
    issue := null;
    legacy_fee := r.total_fee;
    legacy_paid := r.paid_amount;
    legacy_due := v_due;
    return next;

    if not p_dry_run then
      insert into public.member_cycles (
        gym_id, member_id, cycle_number, plan_name,
        start_date, end_date, plan_fee, carried_arrears,
        paid_amount, transferred_arrears, outstanding_due,
        is_current, status, created_at, updated_at
      ) values (
        r.gym_id, r.id, 1, trim(r.plan),
        r.start_date, r.end_date, r.total_fee, 0.00,
        r.paid_amount, 0.00, v_due,
        v_is_active,
        case when v_is_active then 'active' else 'completed' end,
        r.created_at, r.created_at
      ) returning id into v_cycle_id;

      if r.paid_amount > 0 then
        insert into public.payment_transactions (
          gym_id, member_id, cycle_id, transaction_type,
          amount, payment_method, notes, created_at
        ) values (
          r.gym_id, r.id, v_cycle_id, 'legacy_opening',
          r.paid_amount, 'legacy',
          'Unverified legacy balance snapshot', r.created_at
        );
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.migrate_legacy_member_balances(boolean) from public, anon;
grant execute on function public.migrate_legacy_member_balances(boolean) to authenticated;

-- ==============================================================================
-- 14. Reporting Views & Pre/Post Migration Reconciliation Views
-- ==============================================================================
create or replace view public.gym_financial_dashboard_metrics
with (security_invoker = true)
as
select
  g.id as gym_id,
  coalesce(c.active_gross_payable, 0.00) as active_gross_payable,
  coalesce(c.active_collected, 0.00) as active_collected,
  coalesce(c.active_outstanding_due, 0.00) as active_outstanding_due,
  coalesce(p.realized_cash_collected, 0.00) as realized_cash_collected,
  coalesce(p.total_refunded, 0.00) as total_refunded,
  (coalesce(p.realized_cash_collected, 0.00) - coalesce(p.total_refunded, 0.00)) as net_cash_collected,
  coalesce(p.legacy_opening_volume, 0.00) as legacy_opening_volume
from public.gyms g
left join (
  select
    gym_id,
    sum(gross_payable) as active_gross_payable,
    sum(paid_amount) as active_collected,
    sum(outstanding_due) as active_outstanding_due
  from public.member_cycles
  where is_current = true
  group by gym_id
) c on c.gym_id = g.id
left join (
  select
    gym_id,
    sum(case when transaction_type = 'payment' then amount else 0.00 end) as realized_cash_collected,
    sum(case when transaction_type in ('refund', 'reversal') then amount else 0.00 end) as total_refunded,
    sum(case when transaction_type = 'legacy_opening' then amount else 0.00 end) as legacy_opening_volume
  from public.payment_transactions
  group by gym_id
) p on p.gym_id = g.id;

create or replace view public._migration_reconciliation_check as
select
  m.id as member_id,
  m.name,
  m.total_fee as raw_member_fee,
  m.paid_amount as raw_member_paid,
  c.gross_payable as cycle_gross_payable,
  c.paid_amount as cycle_paid_amount,
  c.outstanding_due as cycle_outstanding_due,
  coalesce(p.total_ledger_paid, 0.00) as total_ledger_paid,
  case 
    when q.id is not null then ('QUARANTINED: ' || q.rejection_reason)
    when c.id is null then 'MISSING_CYCLE'
    when m.total_fee <> c.gross_payable then 'FEE_MISMATCH'
    when m.paid_amount <> c.paid_amount then 'PAID_MISMATCH'
    when c.paid_amount <> coalesce(p.total_ledger_paid, 0.00) then 'LEDGER_MISMATCH'
  end as discrepancy_type
from public.members m
left join public.member_cycles c on c.member_id = m.id and c.cycle_number = 1
left join public._legacy_members_quarantine q on q.id = m.id
left join (
  select cycle_id, sum(case when transaction_type in ('payment', 'legacy_opening') then amount else -amount end) as total_ledger_paid
  from public.payment_transactions
  group by cycle_id
) p on p.cycle_id = c.id
where q.id is not null -- Expose quarantined records directly
   or c.id is null -- Detects members missing a cycle
   or m.total_fee <> c.gross_payable -- Detects fee mismatches
   or m.paid_amount <> c.paid_amount -- Detects paid amount mismatches
   or c.paid_amount <> coalesce(p.total_ledger_paid, 0.00); -- Detects ledger discrepancies

-- Comprehensive multi-cycle ongoing reconciliation view (checks renewals and historical refunds across all cycles)
create or replace view public.gym_active_cycle_reconciliation_check as
select
  m.id as member_id,
  m.name,
  c.id as active_cycle_id,
  c.cycle_number,
  m.total_fee as cached_member_total_fee,
  c.gross_payable as active_cycle_gross_payable,
  m.paid_amount as cached_member_paid_amount,
  c.paid_amount as active_cycle_paid_amount,
  c.outstanding_due as active_cycle_outstanding_due,
  coalesce(p.total_ledger_paid, 0.00) as active_ledger_paid,
  case
    when c.id is null then 'NO_ACTIVE_CYCLE'
    when m.total_fee <> c.gross_payable then 'CACHE_TOTAL_FEE_MISMATCH'
    when m.paid_amount <> c.paid_amount then 'CACHE_PAID_AMOUNT_MISMATCH'
    when c.paid_amount <> coalesce(p.total_ledger_paid, 0.00) then 'ACTIVE_LEDGER_MISMATCH'
    when c.gross_payable <> (c.paid_amount + c.transferred_arrears + c.outstanding_due) then 'MATH_INVARIANT_VIOLATION'
  end as discrepancy_type
from public.members m
left join public.member_cycles c on c.member_id = m.id and c.is_current = true
left join (
  select cycle_id, sum(case when transaction_type in ('payment', 'legacy_opening') then amount else -amount end) as total_ledger_paid
  from public.payment_transactions
  group by cycle_id
) p on p.cycle_id = c.id
where c.id is null
   or m.total_fee <> c.gross_payable
   or m.paid_amount <> c.paid_amount
   or c.paid_amount <> coalesce(p.total_ledger_paid, 0.00)
   or c.gross_payable <> (c.paid_amount + c.transferred_arrears + c.outstanding_due);



-- ==============================================================================
-- 15. RLS Policies and Column-Level Privilege Lockdown
-- ==============================================================================
alter table public.member_cycles enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.member_renewals enable row level security;

drop policy if exists "member_cycles_select_own" on public.member_cycles;
create policy "member_cycles_select_own" on public.member_cycles
  for select to authenticated
  using (gym_id = auth.uid() and public.is_active_gym());

drop policy if exists "payment_transactions_select_own" on public.payment_transactions;
create policy "payment_transactions_select_own" on public.payment_transactions
  for select to authenticated
  using (gym_id = auth.uid() and public.is_active_gym());

drop policy if exists "member_renewals_select_own" on public.member_renewals;
create policy "member_renewals_select_own" on public.member_renewals
  for select to authenticated
  using (gym_id = auth.uid() and public.is_active_gym());

-- Revoke direct ledger mutation privileges from client roles
revoke insert, update, delete on public.member_cycles from authenticated, anon, public;
revoke insert, update, delete on public.payment_transactions from authenticated, anon, public;
revoke insert, update, delete on public.member_renewals from authenticated, anon, public;
revoke all on public.idempotency_keys from authenticated, anon, public;

-- Revoke table-level update on members and grant explicit column-level updates
revoke update on public.members from authenticated, anon, public;
grant update (
  name,
  phone,
  plan,
  start_date,
  end_date,
  notes,
  facility,
  personal_trainer,
  trainer_name
) on public.members to authenticated;

commit;

