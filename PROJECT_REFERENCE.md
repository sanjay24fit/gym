# PROJECT_REFERENCE.md — Gym Manager (complete technical reference)

> Purpose: a single, complete description of this codebase so an AI/human can make changes
> without re-reading every file. Everything below was verified against the actual source.

---

## 1. What the product is

**Gym Manager** — a multi-tenant SaaS for gym owners in India.

- One website, many gyms. Each gym owner = one Supabase auth user = one row in `gyms`.
  Owner sees **only their own** members/payments (enforced by Postgres RLS, not just UI).
- A platform **admin** (a row in `admins`) can approve/block gyms, set expiry, create owner accounts. Admin **cannot** read member personal data.
- **Owner features**: Dashboard KPIs, Members CRUD (add/edit/renew/delete), Payments/dues tracking, Gym profile & subscription, notebook photo → OCR import, dark/light theme, 27-language UI, PWA install.
- **Monetization**: ₹499 / 30 days subscription paid via Razorpay (checkout modal + serverless order/signature verification, with a direct UPI-link fallback).

**Stack**: React 19 + Vite 8 (JSX, no TypeScript), Supabase (Auth + Postgres + RLS), Tesseract.js 7 (client-side OCR), Razorpay (payments), Vercel serverless functions in `/api`, plain CSS (one big `index.css`, CSS variables, no Tailwind/CSS-modules).

**Not used**: `react-router-dom` is in `package.json` but **never imported** — routing is a `tab` state in `App.jsx`. No test framework (only two hand-rolled node scripts). No git repo in this folder. No `node_modules` / `.env` present yet.

---

## 2. File map (repo root = `D:\gym-main\gym-main`)

```
index.html                     PWA meta, Google Fonts (Outfit, Plus Jakarta Sans, Inter),
                               inline theme flash-prevention script, #google_translate_element
vite.config.js                 react plugin; dev proxy /supabase -> http://127.0.0.1:54321
package.json                   scripts + deps (see §3)
.env.example                   all env vars (VITE_* client, non-VITE server-only)
.oxlintrc.json                 oxlint with react/rules-of-hooks=error
README.md                      marketing/setup doc (partly OUT OF DATE — see §12)

src/main.jsx                   React root; ThemeProvider > LanguageProvider > App;
                               registers service worker /sw.js
src/App.jsx            (447)   the entire app shell + state machine (see §5)
src/index.css          (2997)  ALL styling (see §11)

src/lib/supabase.js     (27)   client factory, isSupabaseConfigured, createIsolatedClient()
src/lib/utils.js        (116)  date/money/status helpers + PLANS/FACILITIES (see §7)
src/lib/theme.jsx       (68)   ThemeProvider / useTheme, localStorage 'gym_theme'
src/lib/language.jsx    (144)  LanguageProvider / useLanguage, 27 langs, Google Translate
src/lib/razorpay.js     (164)  checkout SDK loader + initiateSubscriptionPayment()
src/lib/ocrParser.js    (353)  text -> member records parser (see §10)
src/lib/imagePreprocessor.js (102) canvas rotate/grayscale/contrast/crop/resize

src/components/                 see §6 for per-component detail
  App-level: Auth, AccessBlocked, Dashboard, Members, Payments, GymProfile, Admin,
             PaymentForm, SetupNotice, GymLogo, DownloadAppModal, ResetPassword, UtilityMenu
  Modal, MemberForm, NotebookScanner, LanguageToggle, ThemeToggle, WhatsAppSupport

api/payments/create-order.js (93)   Vercel fn: create Razorpay order
api/payments/verify-payment.js (132) Vercel fn: verify signature + extend subscription

supabase/migrations/
  20261014000000_init.sql                          core schema + RLS
  20261022000000_add_facility_and_pt.sql           members.facility / personal_trainer / trainer_name
  20261023000000_add_subscriptions_and_razorpay.sql gyms.subscription_* + gym_subscriptions + 21-day trial trigger
supabase/config.toml                    local supabase CLI config (project id "gym-manager")

public/  manifest.webmanifest, sw.js (no-op SW), icon.svg, icon-192/512.png,
         favicon-32/64.png, apple-touch-icon.png, gym-logo.png (Razorpay merchant image)

scripts/test-ocr-parser.mjs   `npm run test:ocr` — 7 assertions on the parser
scripts/rls-test.mjs          `npm run test:rls` — 17 RLS isolation checks vs local supabase
scripts/generate-icons.mjs    one-off PNG generator (sharp)
```

Line counts (approx): Dashboard 570 · Members 364 · NotebookScanner 875 · Admin 428 · GymProfile 390 · UtilityMenu 359 · Payments 240 · MemberForm 250 · Auth 282 · DownloadAppModal 211 · AccessBlocked 156 · ResetPassword 143 · LanguageToggle 135 · SetupNotice 57 · WhatsAppSupport 56 · ThemeToggle 66 · GymLogo 60 · Modal 13.

---

## 3. Commands, deps, env

```bash
npm install
npm run dev          # vite (host: true, allowedHosts: true)
npm run build        # vite build
npm run preview
npm run lint         # oxlint
npm run test:ocr     # node scripts/test-ocr-parser.mjs
npm run test:rls     # ANON_KEY=<key> node scripts/rls-test.mjs (needs `npx supabase start` + docker)
npx supabase start   # local stack; migration files auto-applied
```

**dependencies**: `@supabase/supabase-js ^2.117.3`, `react ^19.2.8`, `react-dom ^19.2.8`, `react-router-dom ^7.18.4` (UNUSED), `tesseract.js ^7.0.0`.
**devDependencies**: `@vitejs/plugin-react ^6.1.1`, `vite ^8.3.0`, `oxlint ^1.81.0`, `supabase ^2.120.0`, `@types/react*`.

**Environment variables** (`.env.example`):

| Var | Where used | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | client + server fns | Supabase project URL; may be `/supabase` (relative → Vite proxy) |
| `VITE_SUPABASE_ANON_KEY` | client + server fns | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `verify-payment.js` only | bypass RLS to update `gyms` (never client-side) |
| `VITE_RAZORPAY_KEY_ID` | client (via API response) & server fallback | public key id |
| `RAZORPAY_KEY_ID` | server | preferred server-side key id |
| `RAZORPAY_KEY_SECRET` | server | order creation + HMAC verification |
| `VITE_RAZORPAY_HANDLE` | declared, unused | direct handle |
| `VITE_RAZORPAY_ME_URL` | declared, **unused in code** (hardcoded string instead) | direct UPI link |

`src/lib/supabase.js`: `isSupabaseConfigured = Boolean(rawUrl && anonKey && !rawUrl.includes('YOUR-PROJECT') && anonKey !== 'YOUR-ANON-KEY')`. If false → `App` renders `<SetupNotice/>`. Placeholder URL/key prevent client crash.
`createIsolatedClient()` → separate auth client, `persistSession:false`, `storageKey:'gm-isolated'` (used by Admin to sign up owners without clobbering the admin session).

---

## 4. Database (source of truth: `supabase/migrations/*.sql`)

### Tables

**`public.admins`** — `user_id uuid PK references auth.users`. No client reads (all grants revoked).

**`public.gyms`** — one row per owner; `id` PK = `auth.users.id`.
`email`, `gym_name`, `owner_name`, `phone`, `status` ∈ `('pending','active','blocked')` default `'pending'`,
`valid_until date` (null = unlimited), `created_at`,
plus (migration 3): `subscription_tier` default `'monthly'`, `subscription_status` default `'active'`,
`trial_ends_at timestamptz`, `last_payment_id`, `last_order_id`.

**`public.members`** — `id uuid PK default gen_random_uuid()`, `gym_id uuid not null default auth.uid() → gyms.id`,
`name`, `phone`, `plan`, `start_date date default current_date`, `end_date date`,
`total_fee numeric(10,2) ≥ 0`, `paid_amount numeric(10,2) ≥ 0`, `notes`, `created_at`,
plus (migration 2): `facility text default 'Gym & Fitness'`, `personal_trainer boolean default false`, `trainer_name text default ''`.
Indexes: `members_gym_id_idx`, `members_facility_idx`, `members_pt_idx`.

**`public.gym_subscriptions`** (migration 3) — payment ledger: `id`, `gym_id → gyms`, `amount`, `currency default 'INR'`, `razorpay_order_id`, `razorpay_payment_id`, `status default 'success'`, `plan_duration_days default 30`, `created_at`. RLS: owner reads own, admin reads all.

### Functions / triggers (all `security definer`, `search_path = public`)

| Name | Behavior |
|---|---|
| `is_admin()` | exists in `admins` for `auth.uid()` |
| `is_active_gym()` | own row is `status='active'` AND (`valid_until is null` OR `>= current_date`) |
| `handle_new_user()` | **trigger on auth.users insert** — creates the `gyms` row from `raw_user_meta_data` (`gym_name`, `owner_name`, `phone`). **Migration 3 version**: sets `status='active'`, `valid_until = current_date + 21 days`, `trial_ends_at = now()+21d`, `subscription_tier='trial'`, `subscription_status='trial'`, `on conflict (id) do nothing` |
| `admin_gym_member_counts()` | returns `(gym_id, member_count)`; raises if not admin |

### RLS matrix

| Table | select | insert | update | delete |
|---|---|---|---|---|
| `admins` | nobody (grants revoked) | — | — | — |
| `gyms` | own row **or** admin | — | admin only | admin only |
| `members` | `gym_id = auth.uid() AND is_active_gym()` | same | same (using + with check) | same |
| `gym_subscriptions` | own `gym_id` or admin | — (service role writes) | — | — |

Grants: `anon` gets **nothing**; `authenticated` gets explicit CRUD on `members`, select/update/delete on `gyms`, execute on the 3 functions.

**Consequences (invariants):**
- Pending/blocked/expired owner → 0 rows from `members` (DB-level, not UI).
- Admin can approve/block but **cannot** read member names/phones.
- Self-approval impossible (`gyms_update_admin` policy).
- Owner cannot insert `members` with someone else's `gym_id` (default + with-check).

---

## 5. `src/App.jsx` — app shell / state machine

State: `session`, `loadedAccount {userId,gym,isAdmin}`, `isPasswordRecovery`, `members[]`, `tab`, `filter`, `refreshKey`, `loadError`, `membersInitialDialog`, `paymentDialogMember`, `showDownloadApp`, `deferredPrompt`, `isInstalled`.

Flow:
1. `!isSupabaseConfigured` → `<SetupNotice/>`.
2. `isPasswordRecovery` (detects `type=recovery` in hash or query) → `<ResetPassword onComplete onCancel>`.
3. On session: `Promise.all([ gyms.select('*').eq('id',userId).maybeSingle(), rpc('is_admin') ])` → `setAccount`, `setTab(isAdmin ? 'admin' : 'dashboard')`.
4. `canUseGym = gym?.status === 'active' && (!gym.valid_until || gym.valid_until >= today())`.
5. `session && loadError` → error card (Try again = `refresh()`).
6. `session === undefined || (session && !account)` → "Loading…".
7. `!session` → `<Auth/>` (+ DownloadAppModal).
8. `!isAdmin && !canUseGym` → `<AccessBlocked gym userEmail onLogout onRefresh/>`.
9. Otherwise the shell: `<header class="topbar">` (GymLogo + brand + centered desktop nav + `<UtilityMenu/>`), `<main class="content">` tab switch, standalone `<PaymentForm/>` when `paymentDialogMember`, `<DownloadAppModal/>`, mobile `<nav class="bottom-nav">`.

Tabs (keys): `dashboard`, `members`, `payments`, `gym` (only if `canUseGym`) + `admin` (only if `isAdmin`).

`loadMembers()` — pages `members` 1000 rows at a time, `.order('end_date').order('id').range(...)`, `alert()` on error, skips loading while `!canUseGym`.

`handleDashboardAction(action, data)`: `'add'` → Members tab + `{type:'add'}`; `'scan'` → Members + `{type:'scan'}`; `'payments'` → payments tab; `'download'` → install prompt; `'pay'` → `paymentDialogMember = data`.

`handlePaymentSave(values)` → `members.update(values).eq('id', member.id)`, returns error string or undefined, closes, reloads.

`refresh()` clears account + bumps `refreshKey` (also resets `tab` to admin/dashboard via the load effect).
`logout()` clears members/loadError then `signOut()`.

PWA: listens to `beforeinstallprompt` / `appinstalled`, persists `localStorage['gym_app_installed']`.

---

## 6. Component reference

### 6.1 `Auth.jsx` — login / register / forgot password
- Modes: `'login' | 'signup' | 'forgot'`. Props: `onDownloadApp`, `isInstalled`.
- Calls: `signInWithPassword`, `signUp({..., options:{data:{gym_name,owner_name,phone}}})`, `resetPasswordForEmail(email,{redirectTo: origin+pathname})`.
- `friendly(msg)` maps: `Invalid login credentials`→"Incorrect email or password"; `/email not confirmed/i`; `/rate limit/i`; `/already registered/i`; `/user not found/i`.
- Signup duplicate detection: `data.user?.identities?.length === 0`.
- UI: tabs **Owner Login / Register New Gym**, password eye toggle, "Forgot password? (पासवर्ड भूल गए?)", download button (hidden if installed or forgot mode), `<WhatsAppSupport variant="link">`, ThemeToggle + LanguageToggle bar.
- Validation: HTML `required`, password `minLength=6`. No phone/email regex.
- Note: switching tabs does not clear the form.

### 6.2 `AccessBlocked.jsx` — gate for pending/blocked/expired
- Props: `gym, userEmail, onLogout, onRefresh`.
- **Quirky flags**: `isExpired = gym?.status === 'active' || Boolean(gym?.valid_until)`; `isBlocked = status === 'blocked'`.
- Titles (priority): default "Approval pending" → "Account blocked" → "Subscription Expired" → (no gym) "Account not found".
- Renders "Monthly Gym Plan · ₹499 / 30 Days" card with `💳 Pay ₹499 via Razorpay / UPI` (`initiateSubscriptionPayment`, amount 499) unless blocked; direct link `https://razorpay.me/@sanjaysalvi2245`; `🔄 Refresh Account Status`; WhatsApp support; Logout.
- Success → message + `setTimeout(onRefresh, 1200)`.

### 6.3 `Dashboard.jsx`
- Props: `members, onOpen(filterKey), onAction(action,data), gymName, isInstalled` (last one **unused**).
- Sections: greeting header (time-of-day greeting, `en-IN` date, search + bell with badge), notification popover, hero card with SVG retention ring (`strokeDasharray 251.2`), membership health card (4 metrics: active / expiring / expired / Paid %), 2×2 pastel grid (Memberships, Payments & Fees, Personal Trainer, Pending Dues), quick-recap row (Add Member, Scan Register, static sparkline cards), two lists: "Expiring Soon" (top 5) and "Pending Dues" (top 5, `Collect Payment`).
- Derived: `active = status !== 'expired'`, `expiring` sorted asc, `expired`, `expiringToday` (`daysLeft===0`), `ptMembers`, `due` sorted by amount desc, `totalDue`, `totalCollected = Σ paid_amount`,
  `retentionRate = min(100, round(active/len*100)) || 95`, `collectionRate = min(100, round(collected/(collected+due)*100)) || 92` ← **hardcoded fallbacks**,
  `pendingAlertsCount = expiringToday.length + (due.length>0 ? 1 : 0)`.
- Only local state: `showNotificationPopup`. No Supabase calls.

### 6.4 `Members.jsx` — the CRUD hub
- Props: `members, filter, setFilter, reload, initialDialog` (**read once at mount**).
- Filter chips `FILTERS = all | active | expiring | expired | due | pt`, each with count from `matchesFilter`; search over name/phone/facility/trainer/plan; rows sorted by `end_date` asc.
- Table columns: Member, Plan & Facility, Expiry, Payment, actions (`Payment` only if due>0, always `Renew`, `Edit`, `Remove`).
- Dialogs: `add|edit|renew` → `MemberForm`; `pay` → `PaymentForm`; `remove` → confirm `Modal`; `scan` → `NotebookScanner existingMembers={members} onImportSuccess={…reload}`.
- **`save(values)`** is the central write path:
  ```js
  insert → members.insert(values)          // add
  update → members.update(values).eq('id', id)
  delete → members.delete().eq('id', id)
  ```
  On error containing `'schema cache'`, `'facility'`, `'personal_trainer'`, `'trainer_name'` or code `PGRST204`, it **retries with a reduced payload** (drops those 3 columns) and re-encodes them into `notes`:
  `"[Facility: X]"` and `"[PT: Yes | Trainer: Y]"` tags.
  Returns error **string** on failure, falsy on success (contract used by both forms).
- Fragility: `m.phone.includes(q)` unguarded if `phone` is null.

### 6.5 `MemberForm.jsx` — Add/Edit/Renew modal
- Props: `member?, renew, onSave(values)→errString, onDelete?, onScanNotebook?, onClose`.
- Fields: Name, Mobile, Plan (`PLANS` + Custom), Facility (`FACILITIES` + "Custom Facility…"), PT toggle card + trainer name, Start/Expiry dates, Total fee/Paid, Notes.
- `set(k)` auto-recomputes `end_date = planEndDate(start_date, months)` when `plan` or `start_date` changes and plan is canonical.
- **Renew mode**: `start = end_date >= today() ? addDays(end_date,1) : today()`, name disabled, `previousDue = dueAmount(member)`, `total_fee = old total + previousDue`, **`paid_amount` reset to 0**.
- **Add mode default**: plan `1 Month`, facility `Gym & Fitness`, start `today()`, end `planEndDate(today,1)`.
- Validation strings: `'Expiry date cannot be before start date'`, `'Paid amount cannot be more than total fee'`.
- Submit payload: `{name, phone, plan, facility, personal_trainer:Boolean, trainer_name|'', start_date, end_date, total_fee:Number||0, paid_amount:Number||0, notes}`.
- `cleanNotes()` strips `[Facility: …]` / `[PT: …]` tags before saving.

### 6.6 `PaymentForm.jsx` — collect payment modal
- Props: `member, onSave({paid_amount: old + value}) → errString, onClose`.
- Prefills amount with `dueAmount(member) || ''`.
- Validation: `'Amount must be greater than 0'`, `` `Amount cannot be more than the due amount (₹X)` ``.
- ⚠️ On a fully-paid member the "Edit Payment" path can never save (value > 0 > due) — dead end.

### 6.7 `Payments.jsx`
- Props: `members, onCollectPayment(m)` (App renders the modal).
- Metrics: Total Collected, Outstanding Due, Payment Clear Rate (`clearPercent = totalRevenue ? round(collected/revenue*100) : 100`).
- Chips: `Payment Due` / `Fully Paid` / `All Records`, default `'due'`; search name/phone/facility/trainer/plan; sort by due desc.
- Every row button calls `onCollectPayment` (label `Collect Payment` or `Edit Payment`).

### 6.8 `GymProfile.jsx` — settings tab
- Props: `gym, userEmail, onLogout, onDownloadApp, isInstalled, onRefresh`.
- Sections: identity card, Subscription Status (badge `● Expired` when `daysRemaining <= 0` else `● Active Plan`; `formatDate(valid_until)` / `Unlimited Access`; renew button `⚡ Renew Plan (₹499 / 30 Days)`), Download App card, Theme cards (Charcoal Dark / Clean Light → `setTheme`), Language (`<LanguageToggle/>`), Password card → modal (`updateUser({password})`, checks `<6` and mismatch, success closes after 1500 ms), Support card, Sign Out (native `confirm()`).
- Only Supabase call: `supabase.auth.updateUser`.

### 6.9 `Admin.jsx` — platform admin
- Props: `adminId`. Loads in parallel: `gyms.select('*').neq('id', adminId).order('created_at',{ascending:false})` + `rpc('admin_gym_member_counts')` (RPC error silently ignored → counts 0).
- KPIs: Total Gyms / Active Portals / Pending Approval / Blocked Accounts. Search on gym_name/owner/email/phone.
- Row actions:
  - not active → `Approve` or `Activate`: `{status:'active', valid_until: g.valid_until || plusOneYear()}`
  - active & expired → `Reactivate (1 year)`: `{valid_until: plusOneYear()}`
  - active & not expired → `+1 Year`: `{valid_until: plusOneYear(g.valid_until)}` ; `Expire` → confirm → `{valid_until: addDays(today(), -1)}`
  - not blocked → `Block` → confirm → `{status:'blocked'}`
- `plusOneYear(fromIso)` uses `fromIso` if `>= today` else `today()`, then +1 year (`setFullYear`).
- Inline uncontrolled `<input type="date">` for `valid_until`, `onBlur` saves (rejects values not matching `/^20\d\d-/`).
- `CreateOwner` modal: uses `createIsolatedClient().auth.signUp(...)` then main client `gyms.update({status:'active', valid_until}).eq('id', newUser.id)`; success screen shows credentials; warns if email confirmation is on (`needsConfirm`).
- Helpers used: `addDays, formatDate, parseISO, toISO, today`.

### 6.10 Others
- **`UtilityMenu.jsx`** — hamburger dropdown: header (gym/admin + email + badge), items Language / Theme / Download App / WhatsApp / Sign Out; outside-click + Escape close; contains a **duplicated** language modal (same markup as `LanguageToggle`).
- **`LanguageToggle.jsx`** 🌐 button → language modal (search, Indian vs International grouping: Indian = `flag === '🇮🇳' || code === 'en'`).
- **`ThemeToggle.jsx`** sun/moon button; `showLabel` renders "Light Mode"/"Dark Mode".
- **`WhatsAppSupport.jsx`** exports `WHATSAPP_SUPPORT_URL = 'https://wa.me/916376169315?text=Hello%2C%20I%20need%20help%20with%20the%20Gym%20Manager%20app.'`, `WhatsAppIcon`, default component (`variant='button'|'link'`, `label`, `className`, `iconSize`).
- **`GymLogo.jsx`** inline SVG (dumbbell/diamond). ⚠️ Hardcoded gradient/filter ids (`logoBg`, `primaryGrad`, `accentGrad`, `glow`) → duplicate-id collisions when rendered twice.
- **`DownloadAppModal.jsx`** custom dialog (`role="dialog"`), detects platform (ios/android/desktop) once at mount, native `beforeinstallprompt` button + per-platform manual instructions, "App Already Installed!" state.
- **`ResetPassword.jsx`** set-new-password screen; `updateUser({password})`; validations `≥6 chars`, match; `onComplete` after 1200 ms.
- **`SetupNotice.jsx`** static config help when Supabase env missing (shows `.env` snippets for cloud + local).
- **`Modal.jsx`** 13-line shell: backdrop closes on **`onMouseDown`**, inner panel `stopPropagation`, `×` button. No Escape/focus-trap/portal/aria.

---

## 7. `src/lib/utils.js` — shared contract (touch carefully)

```js
EXPIRING_DAYS = 7
PLANS = [{label:'1 Month',months:1},{label:'3 Months',months:3},{label:'6 Months',months:6},{label:'12 Months',months:12}]
FACILITIES = ['Gym & Fitness','Cardio + Strength','CrossFit & Functional','Zumba & Aerobics',
               'Yoga & Pilates','Swimming Pool','Steam & Sauna','All Access (Full Gym)']
```
| fn | behavior |
|---|---|
| `toISO / parseISO / today()` | local-time `YYYY-MM-DD` (manual, not UTC) |
| `addDays(iso,n)` | date arithmetic |
| `planEndDate(startIso, months)` | month-add, clamp to last day of target month, **then −1 day** (1 Month from Jan 1 → Jan 31) |
| `daysLeft(endIso)` | rounded day diff vs today |
| `dueAmount(m)` | `max(0, total_fee - paid_amount)` |
| `membershipStatus(m)` | `<0` → `'expired'`, `<=7` → `'expiring'`, else `'active'` |
| `formatDate(iso)` | `en-IN` `dd Mon yyyy`, `'-'` if falsy |
| `formatMoney(n)` | `'₹'` + `toLocaleString('en-IN',{maximumFractionDigits:2})` |
| `expiryText(endIso)` | `Expired N days ago` / `Expires today` / `N days left` |
| `getMemberFacility / hasPersonalTrainer / getTrainerName` | read columns first, then **legacy `notes` tags**: `\[Facility:\s*([^\]|]+)\]`, `\[PT:\s*(true|yes)` / `\[Trainer:`, `Trainer:\s*([^\]|]+)` |

**Statuses are exactly** `active | expiring | expired` (member) and `pending | active | blocked` (gym).
**Filter keys are exactly** `all | active | expiring | expired | due | pt` (Dashboard↔Members).
**Dashboard action keys** `add | scan | payments | pay | download`.

---

## 8. Theme system (`src/lib/theme.jsx` + CSS)
- `ThemeProvider` → `{theme, isDark, setTheme('light'|'dark'), toggleTheme()}`; persists `localStorage['gym_theme']` (default **dark**), sets `document.documentElement[data-theme]` and `<meta theme-color>` (`#f8fafc` light / `#090e18` dark).
- `index.html` has an inline script applying `data-theme` before paint (writes theme-color `#F7F7F8`/`#0B0B0C` — slightly different values than the provider).
- CSS: `:root, [data-theme="dark"]` block (lines ~6–120) and `[data-theme="light"]` block (~123–220) defining all tokens: `--bg --card --border --primary --accent --text --muted --success --warning --danger`, pastel tokens (`--pastel-lavender/salmon/peach/blue/mint/coral-*`), component tokens (`--input-bg --modal-bg --table-head-bg --bottom-nav-bg …`), radii (`--radius-xs…full`), shadows.

## 9. Language system (`src/lib/language.jsx`)
- 27 languages in `SUPPORTED_LANGUAGES` (13 "Indian" incl. `en`, 14 international). Persist `localStorage['gym_language']` (default `en`).
- Implementation = **Google Translate widget**: injects `https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit`, sets `googtrans` cookies (`/en/<code>`) for host + `.host`, and drives the hidden `.goog-te-combo` (or `location.reload()` if the widget isn't ready).
- `index.html` contains `<div id="google_translate_element" style="display:none">`; CSS hides Google's banner frames (lines ~2968+).
- ⚠️ Translation is runtime DOM translation — new UI strings are auto-covered, but user-entered data and `input` values may behave inconsistently; `en` resets cookies.

## 10. OCR pipeline (`NotebookScanner` + `ocrParser` + `imagePreprocessor`)

Steps: `'select' → 'preview' → 'ocr' → 'review' → 'imported'`.

1. **Capture**: live `getUserMedia({facingMode:'environment', width:1920})` on desktop, `<input type="file" capture="environment">` on mobile UA; canvas → `toDataURL('image/jpeg',0.92)`.
2. **Adjust**: rotation 0/90/180/270, grayscale checkbox, contrast checkbox (writes `1.3`/`1.0`, initial state is `1.2`), crop sliders top/bottom 0–40% (left/right exist in state but have no UI). Auto re-runs `preprocessImage(raw, {rotation, grayscale, contrast, crop:{xPercent,yPercent,widthPercent,heightPercent}, maxDimension:1920})` → JPEG data URL (quality 0.88).
3. **OCR**: `createWorker('eng', 1, {logger})` (Tesseract v7, LSTM), progress text + bar, cancel terminates worker. **No confidence threshold** (`data.confidence` unused).
4. **Parse** → `parseNotebookText(text)` (see below) → records get `tempId`, `selected:true`.
5. **Review**: editable raw-text `<textarea>` + "Re-parse Text", per-record fields, validation, duplicate-by-phone warning (amber, non-blocking), select/remove/add-manual. Changing `plan`/`start_date` recomputes `end_date` for canonical plans.
6. **Import**: sequential `supabase.from('members').insert(...)` with payload
   `{name, phone(digits), plan, facility:'Gym & Fitness', personal_trainer:false, trainer_name:'', start_date, end_date, total_fee:Number||0, paid_amount:Number||0, notes: notes || 'Scanned from notebook'}`;
   same schema-drift fallback (drop the 3 newer columns on `PGRST204`/`schema cache`). Failures return to `'review'` with per-row errors.

**Validation (`validateRecord`)**: `Name is required` · `Mobile must be 10 digits` (`/^\d{10}$/` after stripping spaces/dashes) · `Expiry date cannot be earlier than start date` · `Paid amount cannot exceed total fee` · `Amounts cannot be negative`.

**`ocrParser.js` exports** (no constants): `cleanLine, isHeaderRow, parseAnyDate, normalizePlan, extractPhone, parseSingleRecordBlock, parseTabularLine, parseNotebookText`.
- `parseAnyDate`: normalizes `.`/`/` → `-`; supports `YYYY-MM-DD`, `DD-M-YYYY` (**day-first**), `D Mon YYYY` (month map by 3-letter prefix). Else `null`.
- `normalizePlan`: keyword rules `12 month|1 year|1 yr|annual` → `12 Months`, `6 month|half year|6m` → 6, `3 month|quarter|3m` → 3, `1 month|monthly|1m` → 1, else exact `PLANS` match, else `'Custom'`; default `'1 Month'`.
- `extractPhone`: Indian pattern `(?:\+91)?(?:0)?([6-9]\d{4}[\s-]?\d{5})`, fallback `\b\d{10}\b`, else `''`.
- Record default: `{name:'', phone:'', plan:'1 Month', start_date:today(), end_date:planEndDate(today(),1), total_fee:'', paid_amount:'', notes:'', detectedFields:{}}`.
- **Strategy order**: ① tabular (split on `|`, `,`, or 2+ spaces; first phone / first two dates / first two money / plan / name) — wins if ≥2 rows; ② numbered/labeled blocks (`1.`, `#1`, `Name:`) using label regexes (`Name:`, `Mobile:`, `Plan:`, `Joining Date:`, `Expiry Date:`, `Fee:`/`Total Fee:`, `Paid:`) with fallbacks for standalone phone and heuristic name (letters only, length 2–40); ③ single record.
- Header rows skipped when ≥2 header keywords match; end date derived from `start_date + plan` unless explicit.
- ⚠️ Names are stripped to `[a-zA-Z .]` — **no Devanagari/regional-script names**; `MM/DD/YYYY` is read as `DD/MM`; no thousand separators.

`npm run test:ocr` → 7 assertions (dates, phones, plans, labeled block, tabular page, multi-block, garbage → 0).

---

## 11. Styling (`src/index.css`, 2997 lines, single file)

Order: CSS variables (dark `:root` then `[data-theme="light"]`) → reset/base (`html`, `body`, fonts) → utilities (`.muted .small .xs .block .font-mono`) → `.btn` (+variants `.primary .secondary .accent .danger .danger-solid .sm .full`, `.link`, `.icon-btn`, `.btn-whatsapp`, `.btn-download-app`) → `.card` → `.badge` (green/amber/red/blue/purple/gray) → `.alert` (error/info/success) → form inputs + `.form/.row` + PT box `.pt-card-box` + `.switch-*` → app shell (`.app`, `.topbar`, `.brand`, `.nav-desktop`, `.hamburger-btn`, `.utility-dropdown`…) → `.bottom-nav` → **dashboard blocks** (`.dash-pastel-header`, `.hero-progress-card`, `.membership-health-card`, `.classified-pastel-grid`, `.quick-recaps-grid`, `.sparkline-stat-card`, `.classified-section-card`) → `.summary-grid`, `.alerts-strip`, `.quick-actions-*` → `.grid-2`, `.section-head`, `.list`, `.avatar-initials` → `.toolbar`, `.search-box`, `.chips`, `.chip` → `.table-wrap`, `.table`, `.actions`, `.empty` → `.modal-backdrop/.modal/.dialog` → `.center-page`, `.auth-card`, `.tabs` → **responsive** → theme toggle/lang UI → Google-Translate overrides.

Responsive breakpoints: `≤1024px` tablet, `≤768px` mobile (topbar/bottom-nav switch, table → card layout), `≤480px`, `≤360px`.

Key class names used in JSX (must stay in sync): `app, topbar, brand, nav-desktop, topbar-actions, content, bottom-nav(-inner/-item), card, btn…, badge, alert, chip(s), toolbar, search-box, table, actions, empty, modal-backdrop, modal, modal-head, modal-actions, dialog-backdrop, dialog, center-page, auth-card, tabs, summary-card(s), grid-2, list, avatar-initials, section-head, dash-*, hero-progress-card, membership-health-card, classified-*, recap-*, sparkline-*, pt-card-box, switch-label/switch-slider, utility-*, lang-option-card, theme-option-*`.

---

## 12. Payments (Razorpay)

**Frontend `src/lib/razorpay.js`**
`initiateSubscriptionPayment({gym, userEmail, amount=499, onSuccess, onError})`:
1. Load `https://checkout.razorpay.com/v1/checkout.js`.
2. Get `access_token` from `supabase.auth.getSession()`.
3. `POST /api/payments/create-order` with `Authorization: Bearer <token>`, body `{amount, currency:'INR', plan:'monthly'}`.
   - On failure with `fallbackUrl` / 404 / 500 → `window.confirm` offering direct UPI at `https://razorpay.me/@sanjaysalvi2245`.
4. Open checkout: `key, amount, currency, name: gym.gym_name || 'Gym Manager'` (explicitly avoids showing the developer's name), `description: '… Monthly Subscription (₹499 / 30 Days)'`, `image:'/gym-logo.png'`, `order_id`, prefill (owner name/email/phone), `notes{business_name,gym_id,gym_name,platform}`, `theme.color:'#2563eb'`.
5. `handler` → `POST /api/payments/verify-payment` with the three signature fields + `plan_days:30, amount` → `onSuccess(data)` / `onError(msg)`. `payment.failed` → `onError`.

**Serverless** (Vercel, files under `api/`, Node runtime, uses `@supabase/supabase-js` + `node:crypto` + global `fetch`):
- `create-order.js`: method check → env check (returns `fallbackUrl` if keys missing) → `supabase.auth.getUser(token)` → fetch `gyms.gym_name` for merchant display → `POST https://api.razorpay.com/v1/orders` with Basic auth, amount in paise (`Math.round(amount*100)`), receipt `receipt_gym_<id8>_<ts>`, notes → returns `{orderId, amount, currency, keyId, gymId, gymName}`.
- `verify-payment.js`: method check → auth → HMAC-SHA256(`order_id|payment_id`) compare with `razorpay_signature` → DB client (service role, else anon+user token) → read `gyms.valid_until`; base = existing `valid_until` if ≥ today else now; `+ plan_days` → update `gyms` (`status:'active'`, `valid_until`, `subscription_tier:'monthly'`, `subscription_status:'active'`, `last_payment_id`, `last_order_id`) → insert ledger row into `gym_subscriptions` → returns `{success, message:'Payment verified! Subscription extended until …', valid_until, payment_id}`.

**Call sites**: `AccessBlocked.jsx` and `GymProfile.jsx`, both hardcoded `amount: 499`, plan copy `₹499 / 30 Days`.
⚠️ There is **no server-side amount validation** (client sends `amount`) and the plan is always monthly; no webhook, no idempotency key (replaying the same signature would extend twice).

---

## 13. PWA
- `manifest.webmanifest`: name "Gym Manager", `display: standalone`, `theme/background: #14243A`, icons 192/512/svg `purpose: any maskable`, `scope/start_url/id: /`.
- `public/sw.js`: no-op (install→skipWaiting, activate→clients.claim, fetch→noop). **No offline caching.**
- Install flow in `App.jsx` (`beforeinstallprompt`, `appinstalled`, `localStorage['gym_app_installed']`) + `DownloadAppModal` with iOS/Android/desktop instructions.

---

## 14. Tests & scripts
- `scripts/test-ocr-parser.mjs` — 7 parser assertions, prints `ALL 7 OCR PARSER TESTS PASSED SUCCESSFULLY! 🎉`.
- `scripts/rls-test.mjs` — 17 isolation checks against `http://127.0.0.1:54321`, needs `ANON_KEY` env, Docker container name hardcoded `supabase_db_gym-manager`, uses `docker exec … psql` to insert/delete the admin row. Verifies: pending signup, no self-approve, non-admin can't call admin RPC, admin sees all gyms but **0 members**, gym A can't touch gym B's rows, anon sees nothing, blocked/expired loses access, renewal restores access.
- `scripts/generate-icons.mjs` — dev utility.
- Lint: `oxlint` with `react/rules-of-hooks: error`, `react/only-export-components: warn`.

---

## 15. Deployment (as designed)
1. Supabase cloud project → run the 3 migration files in order in SQL Editor → disable "Confirm email" → copy URL + anon key.
2. Vercel: import repo (framework Vite), set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (the `/api/*` files become serverless functions automatically — **no `vercel.json` exists**).
3. Put Vercel URL into Supabase Auth → URL Configuration → Site URL.
4. Make yourself admin:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'YOU@example.com';
   ```
5. Local: `npx supabase start`, `cp .env.example .env` with `VITE_SUPABASE_URL=/supabase`, `npm run dev`.

---

## 16. ⚠️ Known bugs / inconsistencies / tech debt (important before changing anything)

1. **README vs migration conflict**: README says new signups are `pending` until approved; migration 3 makes new signups **`active` with a 21-day trial**. The `pending` path still exists for accounts created before that migration or if the trigger is reverted. Decide which is canonical before touching auth/access logic.
2. **`AccessBlocked` flag logic** — `isExpired = status==='active' || Boolean(valid_until)` is almost always true; ordering of the status branches produces misleading titles (e.g. a gym with `valid_until` set but `status:'pending'` shows "Subscription Expired").
3. **`retentionRate || 95` / `collectionRate || 92`** in Dashboard mask real 0% values with fake numbers.
4. **Payments "Edit Payment" dead end** — for a fully-paid member, any amount > 0 is rejected.
5. **Two different "clear %" formulas** — Dashboard (`|| 92`) vs Payments (`: 100`).
6. **`initialDialog` in Members is mount-only** — Dashboard quick actions work only because `Members` remounts when the tab switches; changing to a persistent component would break it.
7. **Schema-drift fallback duplicated** in `Members.save` and `NotebookScanner` import — if you add a `members` column, both fallbacks and `utils.js` `notes`-tag readers must be updated together.
8. **`GymLogo` duplicate SVG ids** when rendered more than once on a page.
9. **`Modal` has no Escape/focus trap/portal/aria**; closes on backdrop `mousedown`.
10. **Native `confirm()`/`alert()`** used in `GymProfile`, `razorpay.js`, `App.loadMembers`.
11. **No pagination anywhere** in tables; `App.loadMembers` pages 1000 at a time but renders everything.
12. **Payment security gaps**: client-supplied `amount`, no webhook/idempotency, signature replay possible.
13. **`m.phone.includes(q)`** can throw if `phone` is null (Members search).
14. **OCR**: no confidence gating, ASCII-only name cleaning, day-first date assumption, row-by-row import (no rollback), `notes` forced to `'Scanned from notebook'`, `facility` forced to `'Gym & Fitness'` on import.
15. **Unused dependency** `react-router-dom`; **unused env** `VITE_RAZORPAY_ME_URL` (URL hardcoded in `razorpay.js` + `AccessBlocked` + `create-order.js`).
16. **`index.html` and `theme.jsx` disagree** on `theme-color` hex values; `index.css` token names are the real source of truth for colors.
17. **Language modal duplicated** in `LanguageToggle.jsx` and `UtilityMenu.jsx`; language = Google Translate cookies (client-side, can fight with `input` values / SSR-less reload).
18. **`NotebookScanner` cleanup effect keyed on `[rawImageSrc]`** → stops camera/revokes URL on every image change, not just unmount; `contrast` initial `1.2` vs toggled `1.3`/`1.0`; `cropBox.left/right` have no sliders.
19. **No `.env`, no `node_modules`, no `.git`** in this folder yet — `npm install` and env setup are prerequisites for running anything.
20. **`Admin.update` closes the confirm dialog and reloads even when the update fails.**

---

## 17. Invariants to preserve when making changes

- RLS remains the security boundary: never add a policy that lets an owner read another `gym_id`, or the admin read `members`.
- `gym_id` defaults to `auth.uid()`; inserts must not accept client-supplied `gym_id` from an owner context.
- `onSave`-style async handlers must **return an error string** on failure and falsy on success.
- Keep the exact literals: statuses `pending/active/blocked` and `active/expiring/expired`; filter keys; `notes` tags `[Facility: …]` / `[PT: … | Trainer: …]`; money `formatMoney`; dates `toISO/parseISO` local-time.
- `planEndDate` subtracts a day — changing it shifts every renewal/expiry calculation.
- Keep `facility/personal_trainer/trainer_name` fallback payload + `utils.js` notes readers in sync.
- Client env vars must be prefixed `VITE_`; secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`) must never be referenced from `src/`.
- The whole UI lives in one `index.css` using CSS variables; add new colors as tokens in **both** dark and light blocks.
