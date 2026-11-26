import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phone, email } = req.body || {}
    if (!phone && !email) {
      return res.status(400).json({ error: 'Email or Phone number is required' })
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    const key = serviceKey || anonKey
    if (!supabaseUrl || !key) {
      return res.status(500).json({ error: 'Supabase configuration missing on server' })
    }

    const supabase = createClient(supabaseUrl, key)

    if (email) {
      const cleanEmail = String(email).trim().toLowerCase()
      const { data, error } = await supabase.rpc('get_member_portal_data_by_email', {
        member_email: cleanEmail,
      })
      if (error) {
        return res.status(500).json({ error: error.message })
      }
      return res.status(200).json(data)
    }

    const { data, error } = await supabase.rpc('get_member_portal_data', { member_phone: phone })
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

