-- =========================================================
-- Gym Manager Migration: Atomic Payment Verification (D1 hardening)
--
-- WHY: api/payments/verify-payment.js previously did a read-then-write
-- idempotency check (SELECT gym, compare last_payment_id, then UPDATE gyms
-- and INSERT ledger as two separate statements). Two concurrent verifications
-- of the SAME Razorpay payment could both pass the check and both extend the
-- subscription and insert two ledger rows.
--
-- FIX: move the apply step into a single SECURITY DEFINER function that runs
-- as ONE transaction with row locking:
--   1. SELECT ... FOR UPDATE on the gym row serializes all payment applies
--      for that gym (row-level lock, released at commit).
--   2. The duplicate check runs AFTER the lock is held, so the second of two
--      concurrent requests reads the COMMITTED result of the first and takes
--      the already_processed branch — exactly one extension, exactly one
--      ledger row. (Postgres default READ COMMITTED: a locking read that
--      waits on a lock re-reads the latest committed row version.)
--   3. Ledger INSERT and gyms UPDATE are in the same transaction: if either
--      fails, both roll back — subscription and ledger cannot diverge.
--   4. A UNIQUE index on gym_subscriptions.razorpay_payment_id is a durable
--      backstop guaranteeing one ledger row per payment id, independent of
--      the row lock. A unique violation on THAT SPECIFIC index is caught
--      in-function and reported as already_processed; any other constraint
--      violation is re-raised and aborts the whole transaction.
--   5. SECURITY: a payment NEVER un-blocks an account ('blocked' stays
--      'blocked'); the plan is validated AGAINST A STRICT ALLOWLIST inside
--      SQL (₹49900 paise / 30 days / monthly) as defense in depth, in
--      addition to the catalog check in the serverless API. EXECUTE is
--      revoked from PUBLIC/anon/authenticated so no client can invoke the
--      function directly to grant itself subscription time without paying.
--
-- SECURITY DEFINER HARDENING:
--   - search_path is pinned to '' (empty): no schema is searched implicitly,
--     temp-schema shadowing is impossible, and every object referenced below
--     is schema-qualified (public.gyms, public.gym_subscriptions) or lives in
--     pg_catalog (jsonb_build_object, numeric, date), which is always
--     implicitly searched and cannot be shadowed by public objects.
--   - Function is owned by the migration role (postgres on Supabase), which
--     is the same SECURITY DEFINER posture as the existing is_admin() /
--     is_active_gym() / handle_new_user() functions in this project.
--   - EXECUTE is granted ONLY to service_role (the serverless backend). The
--     Supabase default privileges may auto-grant EXECUTE to anon/authenticated
--     at creation time; the explicit revokes below run afterwards inside the
--     same transaction and remove them, so the end state is deterministic.
--
-- COMPATIBILITY: only additive (new function + new index). Existing payment
-- records untouched. razorpay_payment_id is NOT NULL (migration
-- 20261023000000), so the unique index cannot be defeated by NULLs (Postgres
-- treats NULLs as distinct in unique indexes — moot here).
-- If unique index creation FAILS, production already has duplicate ledger
-- rows for some payment id (possible under the old racy flow); the explicit
-- transaction below aborts atomically and NOTHING is applied. Resolve
-- duplicates manually first (never automatically — no production data is
-- deleted or rewritten by this migration):
--   select razorpay_payment_id, count(*)
--   from public.gym_subscriptions
--   where razorpay_payment_id is not null
--   group by 1 having count(*) > 1;
--
-- NOTE ON INDEX BUILD: CREATE UNIQUE INDEX (non-CONCURRENT) briefly blocks
-- writes to gym_subscriptions while it builds. The table holds one row per
-- successful payment (small); acceptable at current scale. Going concurrent
-- would require running outside a transaction, which would sacrifice the
-- atomicity guarantee above.
--
-- ROLLBACK:
--   drop function if exists public.apply_subscription_payment(uuid, text, text, bigint, integer, text);
--   drop index if exists public.gym_subscriptions_payment_id_key;
-- =========================================================

begin;

-- 1. Durable payment-identity uniqueness (one ledger row per Razorpay payment id)
create unique index if not exists gym_subscriptions_payment_id_key
  on public.gym_subscriptions (razorpay_payment_id);

-- 2. Atomic apply function (single transaction + row lock)
create or replace function public.apply_subscription_payment(
  p_gym_id uuid,
  p_payment_id text,
  p_order_id text,
  p_amount_paise bigint,
  p_plan_days integer,
  p_plan_id text
)
returns jsonb
language plpgsql
security definer
-- Pinned empty search_path (hardened SECURITY DEFINER): nothing is searched
-- implicitly except pg_catalog; all schema objects are explicitly qualified.
set search_path = ''
as $$
declare
  v_gym public.gyms%rowtype;
  v_new_valid_until date;
  v_constraint text;
begin
  -- Defense-in-depth input sanity.
  if p_gym_id is null or p_payment_id is null or p_order_id is null
     or p_amount_paise is null or p_plan_days is null or p_plan_id is null then
    return jsonb_build_object('error', 'missing_parameters');
  end if;

  -- STRICT PLAN ALLOWLIST (defense in depth): the serverless API already
  -- derives the plan from the VERIFIED Razorpay order amount via the catalog
  -- in api/payments/policy.js. This second, independent gate means that even
  -- a caller with a compromised service-role key cannot apply an arbitrary
  -- amount/duration/id through this function. Deliberate dual maintenance:
  -- adding a new plan must update BOTH the JS catalog AND this allowlist
  -- (fail-closed by design: an un-updated allowlist rejects new plans).
  if p_amount_paise <> 49900 or p_plan_days <> 30 or p_plan_id <> 'monthly' then
    return jsonb_build_object('error', 'unsupported_plan');
  end if;

  -- STEP 1 (the concurrency fix): lock this gym's row. Any other in-flight
  -- apply for the same gym — including one carrying the SAME payment id —
  -- blocks here until we commit or roll back.
  select * into v_gym from public.gyms where id = p_gym_id for update;

  if not found then
    return jsonb_build_object('error', 'no_gym_account');
  end if;

  -- STEP 2: idempotency check under the lock. A sequential retry OR the
  -- loser of a concurrent race reads the committed last_payment_id here and
  -- short-circuits without any write.
  if v_gym.last_payment_id = p_payment_id then
    return jsonb_build_object(
      'already_processed', true,
      'valid_until', v_gym.valid_until,
      'gym_status', v_gym.status
    );
  end if;

  -- STEP 3: extension math — extend from the current end date while it is
  -- still in the future, otherwise from today (UTC; Supabase runs UTC, same
  -- basis as the previous JavaScript implementation).
  if v_gym.valid_until is not null and v_gym.valid_until >= current_date then
    v_new_valid_until := v_gym.valid_until + p_plan_days;
  else
    v_new_valid_until := current_date + p_plan_days;
  end if;

  -- STEP 4+5: ledger insert FIRST, then gyms update — same transaction, so a
  -- failure in either leaves BOTH the subscription and the ledger unchanged.
  begin
    insert into public.gym_subscriptions (
      gym_id, amount, currency, razorpay_order_id, razorpay_payment_id,
      status, plan_duration_days
    ) values (
      p_gym_id,
      (p_amount_paise / 100.0)::numeric(10, 2),
      'INR',
      p_order_id,
      p_payment_id,
      'success',
      p_plan_days
    );
  exception
    when unique_violation then
      -- ONLY the payment-identity index may be treated as an idempotent
      -- success. Any other unique violation (e.g. a future constraint, or a
      -- hypothetical id collision) is re-raised so the transaction aborts
      -- and nothing is applied — it must never be misreported as a
      -- successfully verified payment.
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'gym_subscriptions_payment_id_key' then
        -- This payment id is already in the ledger but is no longer the
        -- gym's last_payment_id (e.g. an older payment replayed after a newer
        -- one). The sub-transaction rolled back the failed insert; we hold
        -- the row lock, nothing was written, and the payment genuinely was
        -- processed before — report idempotent success with current state.
        select * into v_gym from public.gyms where id = p_gym_id for update;
        return jsonb_build_object(
          'already_processed', true,
          'valid_until', v_gym.valid_until,
          'gym_status', v_gym.status
        );
      end if;
      raise; -- any other constraint violation: abort everything
  end;

  -- STEP 6: subscription update, same transaction.
  -- SECURITY (D1): activation is decided here, on the server — a verified
  -- payment may activate pending/expired/trial accounts but NEVER un-block
  -- an account ('blocked' is administrator-only via gyms_update_admin RLS).
  update public.gyms set
    status = case when status = 'blocked' then 'blocked' else 'active' end,
    valid_until = v_new_valid_until,
    subscription_tier = p_plan_id,
    subscription_status = 'active',
    last_payment_id = p_payment_id,
    last_order_id = p_order_id
  where id = p_gym_id;

  return jsonb_build_object(
    'already_processed', false,
    'valid_until', v_new_valid_until,
    'gym_status', (select status from public.gyms where id = p_gym_id)
  );
end;
$$;

comment on function public.apply_subscription_payment(uuid, text, text, bigint, integer, text) is
  'Atomically applies a server-verified Razorpay payment (row-locked, idempotent, plan-allowlisted). EXECUTE restricted to service_role; called only by api/payments/verify-payment.js after HMAC + order-ownership + catalog checks.';

-- 3. Lock down EXECUTE: only the serverless backend (service_role) may apply
-- payments. If authenticated could call this directly, any logged-in user
-- could extend its own subscription with a forged payment id.
-- Grants/revokes target the exact signature created above.
revoke all on function public.apply_subscription_payment(uuid, text, text, bigint, integer, text)
  from public, anon, authenticated;
grant execute on function public.apply_subscription_payment(uuid, text, text, bigint, integer, text)
  to service_role;

commit;
