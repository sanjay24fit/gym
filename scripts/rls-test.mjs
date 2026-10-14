// Verifies multi-gym data isolation against a LOCAL Supabase (npx supabase start).
// Usage: node scripts/rls-test.mjs   (resets nothing; uses random emails)
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

const URL = 'http://127.0.0.1:54321'
const ANON = process.env.ANON_KEY
const mk = () => createClient(URL, ANON, { auth: { persistSession: false } })
let failed = 0
const check = (cond, msg) => { if (!cond) failed++; console.log((cond ? 'PASS ' : 'FAIL ') + msg) }
const psql = (sql) => execSync(`docker exec -i supabase_db_gym-manager psql -U postgres -tA -c "${sql}"`).toString().trim()

const tag = Date.now()
async function signup(name) {
  const c = mk()
  const { data, error } = await c.auth.signUp({
    email: `${name}${tag}@test.com`, password: 'secret123',
    options: { data: { gym_name: `${name} Gym`, owner_name: name, phone: '9000000000' } },
  })
  if (error) throw error
  return { c, id: data.user.id }
}

const ramesh = await signup('ramesh')
const suresh = await signup('suresh')
const admin = await signup('admin')
const anon = mk()

let r = await ramesh.c.from('gyms').select('*')
check(r.data.length === 1 && r.data[0].status === 'pending', 'new signup gets a pending gym row, sees only own row')

r = await ramesh.c.from('members').insert({ name: 'X', end_date: '2030-01-01' })
check(r.error, 'pending owner cannot add members')

await ramesh.c.from('gyms').update({ status: 'active' }).eq('id', ramesh.id)
r = await ramesh.c.from('gyms').select('status').eq('id', ramesh.id).single()
check(r.data.status === 'pending', 'owner cannot self-approve')

r = await ramesh.c.rpc('admin_gym_member_counts')
check(r.error, 'non-admin cannot call admin function')

psql(`insert into public.admins values ('${admin.id}')`)
r = await admin.c.from('gyms').select('*')
check(r.data.length >= 3, 'admin sees all gyms')

await admin.c.from('gyms').update({ status: 'active' }).in('id', [ramesh.id, suresh.id])
r = await ramesh.c.from('gyms').select('status').eq('id', ramesh.id).single()
check(r.data.status === 'active', 'admin can approve owner')

r = await ramesh.c.from('members').insert({ name: 'Ramesh Client', end_date: '2030-01-01', total_fee: 1000 }).select().single()
check(!r.error && r.data.gym_id === ramesh.id, 'active owner can add member (gym_id auto = own id)')
const rameshMember = r.data
await suresh.c.from('members').insert({ name: 'Suresh Client', end_date: '2030-01-01' })

r = await suresh.c.from('members').select('*')
check(r.data.length === 1 && r.data[0].name === 'Suresh Client', "Suresh sees only his own members")

r = await suresh.c.from('members').insert({ name: 'Hack', end_date: '2030-01-01', gym_id: ramesh.id })
check(r.error, "Suresh cannot insert into Ramesh's gym")

r = await suresh.c.from('members').update({ name: 'hacked' }).eq('id', rameshMember.id).select()
check(r.data.length === 0, "Suresh cannot update Ramesh's member")

r = await suresh.c.from('members').delete().eq('id', rameshMember.id).select()
check(r.data.length === 0, "Suresh cannot delete Ramesh's member")

r = await admin.c.from('members').select('*')
check(r.data.length === 0, 'admin cannot read member personal data')

r = await anon.from('members').select('*')
check(!r.data || r.data.length === 0, 'logged-out user sees nothing (members)')
r = await anon.from('gyms').select('*')
check(!r.data || r.data.length === 0, 'logged-out user sees nothing (gyms)')

await admin.c.from('gyms').update({ status: 'blocked' }).eq('id', ramesh.id)
r = await ramesh.c.from('members').select('*')
check(r.data.length === 0, 'blocked owner loses data access')

await admin.c.from('gyms').update({ status: 'active', valid_until: '2020-01-01' }).eq('id', ramesh.id)
r = await ramesh.c.from('members').select('*')
check(r.data.length === 0, 'owner with expired subscription loses data access')

await admin.c.from('gyms').update({ valid_until: '2099-01-01' }).eq('id', ramesh.id)
r = await ramesh.c.from('members').select('*')
check(r.data.length === 1, 'renewed owner gets data back')

psql(`delete from public.admins where user_id = '${admin.id}'`)
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED')
process.exit(failed ? 1 : 0)
