import { supabase } from './supabase'

// Shared payment-update operation (T01 S1): single `paid_amount` column update
// used by both the App-level PaymentForm (Payments tab & Dashboard dues) and
// the Members-tab payment flow. Both callers pass the same payload produced by
// PaymentForm: { paid_amount: Number(member.paid_amount) + amount }.
// Returns an error message string on failure, or null on success.
// NOTE: member-save logic (with its schema-drift fallback) lives in Members.jsx
// and must not be routed through this helper.
export async function updateMemberPayment(memberId, paidAmount) {
  const { error } = await supabase
    .from('members')
    .update({ paid_amount: paidAmount })
    .eq('id', memberId)
  return error ? error.message : null
}
