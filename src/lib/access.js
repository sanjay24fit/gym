// Shared account-access predicates (frontend side of the D1 activation policy).
// These mirror the SQL `is_usable()` rule in supabase/migrations/20261014000000_init.sql:
//   status = 'active' AND (valid_until IS NULL OR valid_until >= current_date)
// so the UI gating and the RLS-gated data access always agree.
// Server-side activation decisions live in api/payments/policy.js — never here.

// Core access check: may this gym use the app right now?
export function canUseGym(gym, todayStr) {
  return gym?.status === 'active' && (!gym.valid_until || gym.valid_until >= todayStr)
}

// Account explicitly blocked by an administrator.
export function isBlockedGym(gym) {
  return gym?.status === 'blocked'
}

// Active account past its validity date (trial or paid — see isTrialGym).
// Status takes precedence: only 'active' rows can be date-expired.
export function isExpiredGym(gym, todayStr) {
  return gym?.status === 'active' && Boolean(gym?.valid_until) && gym.valid_until < todayStr
}

// Trial vs paid comes from the explicit backend field (never inferred from
// dates): the signup trigger writes subscription_status = 'trial' and payment
// verification sets 'active'. Missing/legacy field => not a trial (safe no-crash).
export function isTrialGym(gym) {
  return gym?.subscription_status === 'trial'
}
