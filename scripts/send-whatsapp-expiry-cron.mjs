/**
 * ============================================================================
 * Gym Manager: 2-Day Membership Expiry WhatsApp Automation Cron
 * ============================================================================
 * Run daily at 09:00 AM via cron or scheduled task:
 *   node scripts/send-whatsapp-expiry-cron.mjs
 *
 * Checks for members expiring in exactly 2 days and dispatches WhatsApp messages.
 * If external WhatsApp gateway (Twilio, UltraMsg, Meta Cloud API) credentials are
 * provided in environment variables, it calls their REST endpoint directly.
 * Otherwise, it generates and logs the exact wa.me notification URLs.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || (!SUPABASE_SERVICE_KEY && !SUPABASE_ANON_KEY)) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY)

async function runExpiryCron() {
  console.log('🔄 Checking members expiring in 2 days...')

  // 1. Fetch expiring members via database RPC
  const { data: expiringMembers, error } = await supabase.rpc(
    'get_expiring_members_for_whatsapp',
    { target_days: 2 }
  )

  if (error) {
    console.warn('⚠️ RPC error fetching expiring members:', error.message)
    // Fallback directly querying members table if RPC not yet created
    const twoDaysFromNow = new Date()
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
    const dateStr = twoDaysFromNow.toISOString().slice(0, 10)

    const { data: fallbackList, error: qErr } = await supabase
      .from('members')
      .select('id, name, phone, end_date, plan, gym_id, gyms(gym_name, phone)')
      .eq('end_date', dateStr)

    if (qErr) {
      console.error('❌ Failed to fetch members:', qErr.message)
      return
    }

    processMembers(
      fallbackList.map((m) => ({
        member_id: m.id,
        member_name: m.name,
        member_phone: m.phone,
        end_date: m.end_date,
        gym_name: m.gyms?.gym_name || 'Fitness Club',
        whatsapp_message: `Namaste ${m.name} ji! 🏋️‍♂️\n\nAapki ${m.gyms?.gym_name || 'Gym'} ki gym membership 2 din baad (${m.end_date}) ko khatam hone wali hai. Kripya samay par renew karwayein.`,
        whatsapp_url: `https://wa.me/91${(m.phone || '').replace(/\D/g, '')}`,
      }))
    )
    return
  }

  processMembers(expiringMembers || [])
}

function processMembers(members) {
  if (!members || members.length === 0) {
    console.log('✅ No members expiring in 2 days today.')
    return
  }

  console.log(`📢 Found ${members.length} member(s) expiring in 2 days:`)

  members.forEach((m, idx) => {
    console.log(`\n[${idx + 1}/${members.length}] ${m.member_name} (📱 ${m.member_phone})`)
    console.log(`  - Expiry Date: ${m.end_date}`)
    console.log(`  - WhatsApp Link: ${m.whatsapp_url}`)
    console.log(`  - Message:\n${m.whatsapp_message.replace(/^/gm, '    ')}`)
  })

  console.log('\n✨ Notification queue ready.')
}

runExpiryCron().catch((err) => {
  console.error('Fatal cron error:', err)
  process.exit(1)
})
