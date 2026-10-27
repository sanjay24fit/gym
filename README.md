# Gym Manager

Simple multi-gym membership app. One website, many gym owners — each owner logs in and sees **only their own** members and payments.

- **Dashboard**: total members, active memberships, payment due (count + amount), expiring in 7 days, expired
- **Members**: add / edit / renew / delete, add payment, search, filters
- **Admin Panel** (only for you): approve / block gym owners, set "valid until" (yearly subscription), create owner accounts
- Installable on mobile home screen (PWA)

Tech: React + Vite, Supabase Auth, Supabase Postgres with Row Level Security (RLS).

## How access control works

| Who | What they can do |
|---|---|
| You (admin) | See all gym accounts, approve / block, set subscription end date. Cannot read members' personal data. |
| Gym owner (active) | Full access to **their own** members only. |
| New signup | Status `pending` → no data access until you approve. |
| Blocked owner / expired `valid_until` | No data access (enforced in the database, not just the UI). |

Sharing the website link is fine — nobody can use it without an account that **you** activated.
All rules live in `supabase/migrations/20261014000000_init.sql`.

## Go live (one-time setup)

### 1. Supabase
1. Create a free project at https://supabase.com.
2. **SQL Editor** → paste the whole file `supabase/migrations/20261014000000_init.sql` → Run.
3. **Authentication → Sign In / Providers → Email**: turn **off** "Confirm email" (so accounts you create work immediately).
4. **Project Settings → API**: copy the Project URL and the `anon` public key.

### 2. Hosting (Vercel)
1. Push this folder to a GitHub repo.
2. On https://vercel.com → New Project → import the repo (framework: Vite).
3. Add environment variables:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Deploy. Put the Vercel URL in Supabase → **Authentication → URL Configuration → Site URL**.

### 3. Make yourself admin
1. Open the live site → **Register Gym** with your own email.
2. Supabase **SQL Editor**:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'YOUR-EMAIL@example.com';
   ```
3. Log out / log in → you now see the **Admin Panel**.

## Selling to a new gym owner

Option A — you create the account: Admin Panel → **Create owner account** → give the email + password to the owner.
Option B — owner registers himself → appears as **Pending** → you click **Approve**.

Approving sets "valid until" to 1 year. Use **+1 year** when they renew, or **Block** if they stop paying.

## Local development

```bash
npm install
npx supabase start          # needs Docker; applies the migration
cp .env.example .env        # VITE_SUPABASE_URL=/supabase, VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
npm run dev
ANON_KEY=<anon key> npm run test:rls   # checks gym data isolation
```
