# SOUVIK OS
## MASTER PRODUCT REQUIREMENTS DOCUMENT

**Version:** 1.0
**Status:** Implementation Ready
**Source:** Final Optimized Product Structure (post product-review + 6-round interview)
**Database:** Supabase / PostgreSQL
**Knowledge Layer:** Notion-ready (not implemented in V1)
**AI:** Future integration (not implemented in V1)
**Execution Platform:** Antigravity

---

> ⚠️ **One open architectural decision, flagged per instruction — not silently resolved:**
> The original project brief lists "offline-first whenever possible" as a design principle. True offline-first (local write queue, background sync, conflict resolution) is a meaningfully complex subsystem that does not fit the 3/10 complexity budget this PRD is built to. **This PRD assumes online-first with a simple "you're offline, changes aren't saved" banner for V1**, and defers real offline sync to V2 (see Part 10). If you want true offline-first in V1, say so before Step 1 — it changes the Foundation step.

---

# PART 1 — PRODUCT DEFINITION

### 1. Product Name
Souvik OS

### 2. Product Vision
A private, single-user life operating system for Souvik Das. One place to log the day, see money and tasks at a glance, and keep a light weekly pulse on projects and goals — without becoming a second job to maintain. This PRD supersedes the original 6-module framing (Health/Finance/Work/Projects/Life Dashboard/Mental Wellness) with the consolidated, interview-validated 9-module structure below.

### 3. Product Mission
Replace scattered tracking (notes app, memory, spreadsheets) with one fast daily habit: open, check in, see the day, close. Everything the app asks for must earn its place by being something Souvik will actually enter every day or every week — not something that sounds useful in theory.

### 4. Core Product Principle
> Capture less. Organize automatically. Show only what matters.

### 5. Target User
Souvik Das. Single user, no multi-tenant requirements in V1 (but RLS is built as if multi-user, at no extra cost — see Part 8). Uses the app on **phone and desktop equally**, multiple times per day.

### 6. Core Use Case
**The daily loop (2–5 minutes total, split across multiple opens):**
1. Glance at Home whenever the app is opened — full picture in one screen.
2. Log an expense or task the instant it happens, via Quick Add (2 taps).
3. Complete Daily Check-in once per day (sleep + exercise + habits, under 60 seconds) — nudged by a flexible reminder window, not a rigid alarm.
4. Once a week, glance at Projects and Goals and update progress.

### 7. Product Goals
- Sub-60-second daily check-in
- Single-glance Home dashboard on both mobile and desktop
- Zero duplicate data-entry paths (each fact has exactly one place it's entered)
- Clean Supabase schema that a future AI layer can read without modification

### 8. Non-Goals (explicit)
Souvik OS is **not**: an ERP, CRM, Notion clone, Jira clone, banking app, medical records app, investment/tax platform, or an AI assistant in V1. No document storage. No multi-user support. No true offline sync in V1 (see flag above).

---

# PART 2 — FINAL INFORMATION ARCHITECTURE

```text
Souvik OS
│
├── Home                (single-glance dashboard)
├── Daily Check-in      (core daily loop)
├── Finance             (income, expenses, dashboard)
├── Tasks               (personal task list)
├── Projects            (WaterBook, FuelBook, Souvik OS, etc.)
├── Goals                (2–3 active, category-tagged)
├── Health               (view-only, derived from Check-in)
├── Profile              (stable personal info)
└── Settings              (toggles, theme, notifications, data)
```

**Mobile bottom nav (5 slots):** Home · Check-in · Finance · Tasks · More
**"More" contains:** Projects, Goals, Health, Profile, Settings

**Desktop sidebar (full, persistent):** Home · Check-in · Health · Finance · Tasks · Projects · Goals, with Profile/Settings pinned at the bottom. Desktop has room to show everything without a "More" bucket.

### Module summary table

| Module | Purpose | Main screens | Key data | Primary user actions |
|---|---|---|---|---|
| Home | Single-glance daily overview | 1 screen | Reads from all modules | View, Quick Add |
| Daily Check-in | Core habit loop | 1 flow (multi-step) | `daily_checkins`, `habit_logs` | Answer, submit |
| Finance | Money tracking | Dashboard + Add Expense | `expenses`, `profiles.income_monthly` | Add expense, view charts |
| Tasks | Personal task list | List + filters | `tasks` | Create, edit, complete |
| Projects | Weekly project pulse | List + detail | `projects`, `tasks` (linked) | Create, update status/progress |
| Goals | Weekly goal pulse | List + detail | `goals` | Create, update progress |
| Health | Read-only health view | 1 dashboard | `daily_checkins`, `habit_logs`, `weight_logs` | View, log weekly weight |
| Profile | Stable personal info | 1 form | `profiles` | Edit |
| Settings | App configuration | Sectioned form | `settings`, `habits` | Toggle, configure |

---

# PART 3 — UX SYSTEM

### Desktop UX
Desktop is first-class, not a stretched mobile view (per confirmed equal usage on both platforms).
- **Sidebar:** persistent left sidebar, full nav visible, active state highlighted, collapsible for more content width if needed
- **Header:** page title + contextual primary action (e.g. "+ Add Expense" on Finance)
- **Dashboard grid:** Home uses a responsive multi-column grid (2–3 columns above ~1024px) so "everything in one glance" is genuinely true on a wide screen
- **Content width:** max-width container (~1200px), centered, generous side padding
- **Navigation behavior:** sidebar always visible, no hidden hamburger menu
- **Interaction patterns:** hover states on desktop, modals/side-panels for quick add instead of full page navigation

### Mobile UX
- **Bottom navigation:** 5 fixed items (Home, Check-in, Finance, Tasks, More)
- **Quick actions:** floating action button (FAB) on Home for Quick Add (Expense / Task), always reachable with thumb
- **Touch targets:** minimum 44×44px per accessibility baseline
- **Daily Check-in experience:** full-screen, one-question-at-a-time flow, large tap targets, progress indicator (e.g. "2 of 5")
- **Responsive behavior:** single column, cards stack vertically, charts simplify to essential data only
- **Mobile-specific simplification:** Home shows fewer secondary details than desktop (e.g. Active Projects shows name + status dot only, not the full "what's next" text — tap through for detail)

### Design Principles
- **Typography:** one clean sans-serif family, 2–3 weights max (regular, medium, bold), clear size hierarchy (H1/H2/body/caption)
- **Spacing:** consistent 8px base spacing scale (8/16/24/32)
- **Cards:** rounded corners (~12px), subtle shadow or 1px border, no heavy drop shadows
- **Buttons:** one primary accent color, one neutral secondary style, disabled/loading states defined
- **Inputs:** large tap-friendly fields, clear focus states, inline validation errors
- **States:** every list/screen must define loading, empty, error, and populated states (see Part 9)
- **Colors:** one accent color, neutral grays for structure, semantic colors (green=good/complete, amber=partial, red=needs attention) used sparingly — not decorative
- **Light mode / Dark mode:** both fully designed, manual toggle in Settings (not forced to system-only), token-based color system so both themes stay in sync
- **Accessibility:** WCAG AA contrast minimum, all interactive elements keyboard-reachable on desktop, screen-reader labels on icon-only buttons

Do not over-design: no animation-heavy transitions, no illustration system, no custom icon set — use a standard icon library (e.g. Lucide) throughout.

---

# PART 4 — CORE USER FLOWS

**1. First-time user**
Sign up (email/password) → Profile setup (minimal required fields: name, income) → land on empty Home with a "Complete your first check-in" prompt.

**2. Login**
Enter credentials → Supabase Auth session → redirect to Home.

**3. Profile setup**
Fill required fields (name, income_monthly) + optional fields → save → Profile complete, unlocks Finance snapshot on Home.

**4. Daily Check-in**
```text
User taps "Complete Today's Check-in"
↓
System loads enabled habits from Settings
↓
User answers sleep, exercise, habits, personal tracking, optional text
↓
Database: upsert into daily_checkins (unique per user+date), insert habit_logs rows
↓
UI: "Day Updated ✓", Home snapshot refreshes
```

**5. Adding an expense**
```text
User taps Quick Add → Expense
↓
Enters amount, selects category chip (date defaults to today)
↓
Database: insert into expenses
↓
UI: Finance dashboard + Home snapshot totals update immediately
```

**6. Creating a task**
```text
User taps Quick Add → Task (or from Tasks screen)
↓
Enters title, category, priority (defaults Medium), optional due date, optional project link
↓
Database: insert into tasks
↓
UI: appears in relevant filtered view (Today/Upcoming) and on Home if in top 3
```

**7. Updating a project**
```text
User opens Projects → selects project
↓
Edits status, progress %, "what's next"
↓
Database: update projects, updated_at = now()
↓
UI: Home "Active Projects" shows new "last updated" timestamp
```

**8. Updating a goal**
```text
User opens Goals → selects goal
↓
Edits progress %, status
↓
Database: update goals
↓
UI: Home goals snapshot progress bar updates
```

**9. Reviewing a day**
User taps a past date (from Health trend or a simple date picker) → views that day's check-in, habits, and expenses read-only.

**10. Reviewing monthly progress**
User opens Finance or Health → views monthly aggregate charts (expense by category, sleep/exercise trend).

**11. Changing Settings**
User opens Settings → toggles a module off → Database: update settings.module_toggles jsonb → UI: that module disappears from nav and Home immediately.

**12. Enabling/disabling tracking items**
User opens Settings → Habits section → toggles a habit off → Database: update habits.enabled → UI: that habit chip no longer appears in Check-in from the next session onward (does not delete historical habit_logs).

---

# PART 5 — DAILY CHECK-IN ENGINE

### Question system
Questions are generated from two fixed core questions + a dynamic habit list:
- **Fixed, always shown:** Sleep hours, Exercise Y/N
- **Dynamic, from `habits` table where `enabled = true`:** good habits + personal tracking items (cigarette/alcohol), ordered by `sort_order`
- **Fixed, always shown, always optional:** Achievement text, Notes

Do not hardcode mood, energy, water, or expense questions — these were explicitly removed. Do not add new question types without an explicit product decision.

### Input types
| Question type | Input |
|---|---|
| Sleep hours | Single-select chips: 5 / 6 / 7 / 8 / 9+ |
| Exercise | Toggle (Yes/No) |
| Good habits (boolean type) | Toggle chip |
| Good habits (count type) | Stepper/counter |
| Personal tracking (cigarette/alcohol) | Toggle or counter, per habit config |
| Achievement / Notes | Short text, optional, collapsed by default |

### Completion
- **Save behavior:** each answer saves to local state; final "Submit" writes `daily_checkins` (upsert) + `habit_logs` (bulk insert) in one transaction
- **Draft behavior:** if the user leaves mid-flow, in-progress answers persist in local state only (not DB) until submitted; re-opening Check-in resumes from where they left off, same day only
- **Edit behavior:** same-day check-in is editable (re-open, change, re-submit — upsert on unique `(user_id, date)`); past days are read-only in V1
- **Completion state:** Home CTA switches from "Complete Today's Check-in" to "Today's Check-in Completed ✓" once `daily_checkins` has a row for today
- **Duplicate prevention:** unique constraint on `(user_id, date)` in `daily_checkins` and `(user_id, habit_id, date)` in `habit_logs`
- **Historical review:** read-only list/detail view, accessible from Health module

### Daily record — exactly what gets stored
`daily_checkins`: date, sleep_hours, exercise (bool), achievement_text, notes, completed_at
`habit_logs`: one row per enabled habit per day, with the value for that habit

---

# PART 6 — MODULE SPECIFICATIONS

### Home
- **Sections, in priority order:** Check-in CTA → Today's Snapshot (sleep, exercise, today's spend) → Quick Add → Today's Tasks (top 3) → Finance Snapshot → Goals Snapshot (2–3) → Active Projects
- **Data sources:** `daily_checkins`, `expenses`, `tasks`, `projects`, `goals` — all read-only aggregate queries, nothing computed and stored
- **Empty states:** before first check-in, CTA is prominent and other sections show light placeholder text ("No expenses logged yet", "No tasks yet")
- **Quick actions:** FAB → Expense / Task only
- **Monthly calendar, Needs Attention alerts:** **not in V1** — deferred to V1.1/V2 (Part 10/11)

### Health
- **Metrics:** sleep hours (from check-in), exercise (from check-in), weight (weekly log), supplements adherence (habit_log)
- **Input methods:** no direct entry screen except Weight (weekly prompt/button) — everything else flows in via Check-in
- **History:** 7-day and 30-day toggle on trend views
- **Charts:** sleep trend line, exercise consistency (streak %), weight trend (weekly points), supplements adherence (%)
- **Not included:** medical records, health reports, document upload — any of this belongs in Notion, not Souvik OS

### Finance
- **Income:** single `income_monthly` field on Profile, rarely edited
- **Expenses:** Quick Add — amount (required, >0), category (required, chip select), date (auto = today, editable), note (optional, collapsed)
- **Categories (fixed enum, V1):** Food, Transport, Bills, Shopping, Personal, Family, Entertainment, Other
- **Monthly summary:** income, total expense, remaining (income − expense), savings (= remaining, same calculation, both labels)
- **Charts:** Expense by category (V1), Daily expense (V1), Income vs Expense (V1.1), Monthly trend (V1.1)
- **Quick Add:** shared component used from Home FAB and Finance screen

### Tasks
- **Creation:** title (required), category, priority (default Medium), due date (optional), project link (optional)
- **Editing:** any field editable, status transitions Pending → In Progress → Completed
- **Completion:** sets `completed_at`, moves to Completed filter
- **Priority:** Low/Medium/High, required field with sane default, not optional-to-set
- **Due dates:** optional; tasks without one only appear in "Today" if manually surfaced, not "Overdue"
- **Filters:** Today, Upcoming, Overdue, Completed

### Projects
- **Creation:** name (required), description (optional), status (default Active)
- **Status:** Active / Paused / Completed
- **Progress:** 0–100%, manually set
- **Current focus:** merged into single `whats_next` text field (per simplification)
- **Related tasks:** auto-listed via `tasks.project_id` — no manual linking step needed beyond setting the link on the task
- **Project overview:** list view shows name, status dot, progress bar, "last updated X days ago"

### Goals
- **Creation:** name (required), category (required, fixed enum), target description, target date (optional), status
- **Categories:** Health, Financial, Career, Personal, Startup
- **Progress:** 0–100%, manually set, weekly cadence expected (not enforced, just designed for)
- **Status:** Active / Completed / Abandoned
- **Home:** shows top 2–3 by nearest target date or most-recently-updated

### Profile
Stable info only — no daily/health/expense data. Fields: name, preferred_name, dob, height, weight_reference, location, occupation, work_schedule, email, current_focus, priorities_short, priorities_long, income_monthly, theme_preference.

### Settings
- **Feature toggles:** Health, Finance, Tasks, Projects, Goals — on/off (Check-in always on, cannot be disabled)
- **Habit/tracker toggles:** flat list from `habits` table, enable/disable, add new custom habit
- **Theme:** manual Light/Dark toggle
- **Notifications:** Check-in reminder, on/off, flexible time window (start–end, e.g. 8–10pm) rather than one fixed alarm
- **Data controls:** Export (CSV/JSON download of user's own data), Delete account/data
- **Account:** Logout

---

# PART 7 — DATABASE ARCHITECTURE

**Engine:** Supabase / PostgreSQL. All tables use `uuid` primary keys (`gen_random_uuid()`), all user-owned tables carry `user_id uuid references auth.users(id)`. No soft-delete in V1 — hard delete is fine for a single-user personal app; this is an explicit simplicity decision, not an oversight.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| name | text | required |
| preferred_name | text | optional |
| dob | date | optional |
| height_cm | numeric | optional |
| weight_reference_kg | numeric | optional |
| location | text | optional |
| occupation | text | optional |
| work_schedule | text | optional |
| email | text | required, synced from auth |
| current_focus | text | optional |
| priorities_short | text | optional |
| priorities_long | text | optional |
| income_monthly | numeric | default 0 |
| theme_preference | text | enum: light/dark, default 'light' |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### `settings`
| Column | Type | Notes |
|---|---|---|
| user_id | uuid PK/FK → profiles.id | |
| module_toggles | jsonb | default `{"health":true,"finance":true,"tasks":true,"projects":true,"goals":true}` |
| notification_prefs | jsonb | default `{"checkin_reminder":true,"window_start":"20:00","window_end":"22:00"}` |
| updated_at | timestamptz | |

### `habits`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | required |
| type | text | enum: boolean / count |
| category | text | enum: good_habit / personal_tracking |
| enabled | boolean | default true |
| sort_order | int | default 0 |
| created_at | timestamptz | |

Index: `(user_id, enabled)`

### `habit_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| habit_id | uuid FK → habits.id | |
| date | date | required |
| value_bool | boolean | nullable, used when habit.type = boolean |
| value_count | int | nullable, used when habit.type = count |
| created_at | timestamptz | |

Unique: `(user_id, habit_id, date)`. Index: `(user_id, date)`.

### `daily_checkins`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| date | date | required |
| sleep_hours | numeric | e.g. 5/6/7/8/9 |
| exercise | boolean | |
| achievement_text | text | nullable |
| notes | text | nullable |
| completed_at | timestamptz | |
| created_at | timestamptz | |

Unique: `(user_id, date)`. Index: `(user_id, date)`.

### `weight_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| date | date | |
| weight_kg | numeric | required |
| created_at | timestamptz | |

Index: `(user_id, date)`.

### `expenses`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| amount | numeric | required, > 0 |
| category | text | enum, fixed list from Part 6 |
| date | date | default current_date |
| note | text | nullable |
| created_at | timestamptz | |

Index: `(user_id, date)`, `(user_id, category)`.

### `tasks`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| project_id | uuid FK → projects.id | nullable |
| title | text | required |
| category | text | enum: Personal/Job/Startup/Other |
| priority | text | enum: Low/Medium/High, default Medium |
| due_date | date | nullable |
| status | text | enum: Pending/InProgress/Completed, default Pending |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| completed_at | timestamptz | nullable |

Index: `(user_id, status)`, `(user_id, project_id)`, `(user_id, due_date)`.

### `projects`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | required |
| description | text | nullable |
| status | text | enum: Active/Paused/Completed, default Active |
| progress_pct | int | 0–100, default 0 |
| whats_next | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | auto-updated on any edit |

Index: `(user_id, status)`.

### `goals`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | required |
| category | text | enum: Health/Financial/Career/Personal/Startup |
| target | text | free-text description of "done" |
| progress_pct | int | 0–100, default 0 |
| target_date | date | nullable |
| status | text | enum: Active/Completed/Abandoned, default Active |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Index: `(user_id, status)`.

### Stored vs. calculated
**Stored:** every table above.
**Calculated at read time, never stored:** savings (`income_monthly − sum(expenses this month)`), streaks (consecutive `daily_checkins`/`habit_logs` rows), all chart data, "days since project last updated" (`now() − projects.updated_at`).

---

# PART 8 — SECURITY

- **Authentication:** Supabase Auth (email/password). Single user in V1, but every table is user-scoped from day one.
- **User isolation / RLS:** every table has RLS enabled with policy `using (auth.uid() = user_id)` for select/update/delete and `with check (auth.uid() = user_id)` for insert. `profiles` uses `id = auth.uid()` since the PK is the user id.
- **Authorization:** no roles/permissions system needed for a single user — RLS is the entire authorization model.
- **Sensitive data handling:** personal tracking data (cigarette/alcohol) is treated as sensitive — no third-party analytics on these fields, not surfaced in any exported/shared summary unless explicitly requested.
- **Input validation:** enforced both client-side (form validation) and server-side (Postgres `CHECK` constraints — e.g. `amount > 0`, `progress_pct between 0 and 100`).
- **API security:** client uses the Supabase anon key only, protected entirely by RLS. Service role key never ships to the client.
- **Database security:** no public schema access without auth; all tables private by default.
- **Error handling:** errors shown to the user are generic and actionable ("Couldn't save, try again"); raw database/stack errors are never surfaced in the UI.

---

# PART 9 — DATA BEHAVIOR

- **Create/Read/Update/Delete:** standard CRUD per module as specified in Part 6; no soft-delete in V1 (explicit decision, revisit only if accidental-deletion becomes a real problem).
- **Validation:** required fields enforced at both UI and DB layer (see Part 8).
- **Duplicate prevention:** unique constraints per Part 7 (`daily_checkins`, `habit_logs`, `weight_logs` per date).
- **Empty states:** every list screen (Tasks, Expenses, Projects, Goals) has a defined empty state with a clear call-to-action, not a blank screen.
- **Loading states:** skeleton loaders on Home and list screens, not blank white flashes.
- **Error states:** inline error banner with a retry action on failed writes; toast on failed background refresh.
- **Offline/connection failure behavior (V1 — see flag at top of doc):** a simple "You're offline — changes won't be saved" banner; the app does not queue writes locally. Full offline-first sync is deferred to V2.

---

# PART 10 — FUTURE INTEGRATION ARCHITECTURE

*(Not implemented in V1 — boundaries only.)*

### Notion
Supabase remains the sole source of truth for all structured, queryable data. Notion is reserved for document-shaped content: medical records, long-form notes, FuelBook/startup research. A future one-way sync (Supabase → Notion) may push weekly summaries for archival. Notion is never a write-path into app state.

### Future AI
```text
AI
 ↓
Secure API layer (scoped, read-focused)
 ↓
Supabase
 ↓
Structured data (checkins, expenses, tasks, goals, projects)
```
The AI reads structured tables (via a scoped service role or views) to generate weekly summaries and pattern flags — this is also where the deferred "Needs Attention" alerts eventually get built. The AI does not write directly to core tables; any AI-suggested task or goal lands in a review queue the user approves manually.

### True offline-first (V2)
If prioritized later: local-first storage (e.g. IndexedDB/SQLite on device) + background sync queue + last-write-wins or manual conflict resolution on reconnect. This is a real subsystem, not a checkbox — budget a dedicated step for it when it's prioritized.

---

# PART 11 — IMPLEMENTATION ROADMAP

**8 sequential steps.** Each step is implemented, tested, and verified before the next is authorized. No step starts automatically.

```text
STEP 1  Foundation
   ↓
STEP 2  Daily Check-in Engine
   ↓
STEP 3  Health (view-only)
   ↓
STEP 4  Finance
   ↓
STEP 5  Tasks & Projects
   ↓
STEP 6  Goals
   ↓
STEP 7  Final Dashboard Integration + Polish
   ↓
STEP 8  QA + Production
```

---

### STEP 1 — Foundation

**Objective:** A working, authenticated, navigable shell with Profile and Settings live, on both mobile and desktop.
**Why this step exists:** every later step needs auth, RLS, navigation, and Profile/Settings already in place — building this once prevents rework.
**Features included:** Sign up/login (Supabase Auth), Profile CRUD, Settings shell (module toggles, theme toggle), mobile bottom nav, desktop sidebar, empty Home shell (placeholder cards only).
**Database changes:** create `profiles`, `settings` tables + RLS policies.
**UI changes:** navigation shell (mobile + desktop), Profile screen, Settings screen, light/dark theme system.
**Dependencies:** none — this is the first step.
**What must already exist:** nothing.
**What this step must NOT touch:** Check-in, Health, Finance, Tasks, Projects, Goals — no feature logic beyond Profile/Settings.
**Acceptance criteria:** user can sign up, log in, edit and persist profile fields, toggle theme, see empty Home with correct nav on both mobile and desktop; RLS verified (a second test user cannot see the first user's profile row).
**Testing requirements:** manual RLS test with two accounts; theme toggle persists across reload; responsive check at 375px and 1440px widths.
**Definition of done:** auth + nav + Profile + Settings fully working, RLS confirmed, both layouts verified.

---

### STEP 2 — Daily Check-in Engine

**Objective:** The core daily loop is fully functional end-to-end.
**Why this step exists:** this is the most important feature in the product — it should be built and validated before anything else depends on it.
**Features included:** dynamic Check-in flow (sleep, exercise, enabled habits, personal tracking, optional text), Settings → Habits management (add/enable/disable), Home Check-in CTA + Today's Snapshot wired to real data.
**Database changes:** create `habits`, `habit_logs`, `daily_checkins`, `weight_logs` tables + RLS.
**UI changes:** Check-in flow screens, Habits list in Settings, Home snapshot cards.
**Dependencies:** Step 1 (auth, nav, Settings shell).
**What must already exist:** Profile, Settings shell, navigation.
**What this step must NOT touch:** Finance, Tasks, Projects, Goals.
**Acceptance criteria:** check-in completes in under 60 seconds in manual testing; duplicate check-in on the same day is prevented (upsert, not duplicate row); same-day edit works; historical check-ins are viewable read-only; disabling a habit in Settings removes it from the next Check-in without deleting past `habit_logs`.
**Testing requirements:** unique constraint test (`user_id, date`), habit enable/disable toggle test, resume-mid-flow test.
**Definition of done:** full check-in loop works on mobile and desktop, Home reflects today's check-in state correctly.

---

### STEP 3 — Health (view-only)

**Objective:** Turn Check-in data into a useful read-only health view.
**Why this step exists:** Health has zero new data entry beyond weekly weight — it's a thin layer over Step 2's data, so it's cheap to build right after Check-in exists.
**Features included:** Sleep trend, Exercise consistency streak, Weight trend (weekly log + entry), Supplements adherence.
**Database changes:** none new (reuses `daily_checkins`, `habit_logs`, `weight_logs`).
**UI changes:** Health dashboard screen with 4 charts/views, weekly weight entry prompt.
**Dependencies:** Step 2 (data source).
**What must already exist:** working Check-in data with at least seed/test data to chart against.
**What this step must NOT touch:** Check-in flow itself (read-only consumer), Finance/Tasks/Projects/Goals.
**Acceptance criteria:** charts render correctly against seeded historical data; weight entry saves and appears in the trend; module respects the Settings toggle (Health can be hidden).
**Testing requirements:** chart correctness against known seed data; empty-state test with zero history.
**Definition of done:** Health dashboard accurately reflects Check-in + weight data on both layouts.

---

### STEP 4 — Finance

**Objective:** Full expense tracking and a working money dashboard.
**Why this step exists:** independent of Check-in/Health data — can be built in parallel conceptually, but sequenced here to keep one module fully done before the next starts.
**Features included:** Quick Add Expense, Finance dashboard (income/expense/remaining/savings), Expense-by-category chart, Daily-expense chart, Home Finance Snapshot wired.
**Database changes:** create `expenses` table + RLS.
**UI changes:** Quick Add component (shared with Home FAB), Finance screen, Home finance card.
**Dependencies:** Step 1 (Profile for `income_monthly`).
**What must already exist:** Profile with income field.
**What this step must NOT touch:** Check-in, Health, Tasks, Projects, Goals.
**Acceptance criteria:** expense CRUD works; dashboard totals mathematically match the underlying `expenses` rows; both V1 charts render correctly; category enum enforced.
**Testing requirements:** dashboard total vs. raw sum cross-check; category constraint test (invalid category rejected).
**Definition of done:** Finance module fully functional, Home snapshot wired, Quick Add reusable component in place for Step 5's Task quick-add.

---

### STEP 5 — Tasks & Projects

**Objective:** Full task management with project linkage.
**Why this step exists:** Tasks and Projects are interdependent (tasks link to projects) — building them together avoids a half-built FK relationship.
**Features included:** Task CRUD + filtered views (Today/Upcoming/Overdue/Completed), Project CRUD, task-project linking, Home "Today's Tasks" + "Active Projects" wired.
**Database changes:** create `projects` table first, then `tasks` table (FK to projects) + RLS on both.
**UI changes:** Tasks screen with filters, Project list + detail screen, Quick Add → Task (extends Step 4's shared component).
**Dependencies:** Step 4 (shared Quick Add component).
**What must already exist:** Quick Add component, Home shell.
**What this step must NOT touch:** Check-in, Health, Finance, Goals.
**Acceptance criteria:** task-project linking works both directions (create task from project, or link existing task); filters return correct sets; project "last updated" reflects real edits; priority defaults to Medium and is always set.
**Testing requirements:** filter correctness test per status/date; FK integrity test (deleting a project does not orphan-crash task views — define behavior: unlink, don't cascade-delete tasks).
**Definition of done:** Tasks and Projects both fully functional and linked, Home reflects both correctly.

---

### STEP 6 — Goals

**Objective:** Full goal tracking, weekly-cadence by design.
**Why this step exists:** smallest remaining module, self-contained, no dependencies on Tasks/Projects logic.
**Features included:** Goal CRUD, category tagging, progress tracking, Home Goals Snapshot (top 2–3) wired.
**Database changes:** create `goals` table + RLS.
**UI changes:** Goals screen, Home goals card.
**Dependencies:** Step 1 only (nav, auth).
**What must already exist:** navigation, Home shell.
**What this step must NOT touch:** Check-in, Health, Finance, Tasks, Projects.
**Acceptance criteria:** goal CRUD works; category enum enforced; Home correctly surfaces the top 2–3 by nearest target date/most-recently-updated logic.
**Testing requirements:** progress_pct bounds test (0–100 enforced); category constraint test.
**Definition of done:** Goals fully functional, Home snapshot correct.

---

### STEP 7 — Final Dashboard Integration + Polish

**Objective:** Assemble the fully wired Home dashboard, unify Quick Add, add notifications and data controls.
**Why this step exists:** every module now exists — this step is about making the whole greater than the sum of its parts, and closing remaining Settings/UX gaps.
**Features included:** Final Home layout/priority-order polish across all modules, unified Quick Add (Expense + Task from one FAB), flexible Check-in reminder notification, Settings data controls (Export, Delete), responsive polish pass across every screen.
**Database changes:** none new.
**UI changes:** Home final layout pass, notification scheduling UI, data export/delete flows.
**Dependencies:** Steps 1–6, all complete.
**What must already exist:** every module functional independently.
**What this step must NOT touch:** core schema — this step is integration and polish only, not new data models.
**Acceptance criteria:** full daily loop works end-to-end in one sitting (check-in → quick-add expense → quick-add task → glance at Home reflecting all of it); reminder notification fires within the configured window; data export produces a complete, correct file; data delete actually removes all user rows across every table.
**Testing requirements:** full end-to-end daily-loop test; cross-module data consistency check (Home totals match module screens exactly); notification timing test.
**Definition of done:** Home is the true single-glance dashboard described in Part 6; every module is reachable and consistent from it.

---

### STEP 8 — QA + Production

**Objective:** Full regression, security, and performance pass; ship to production.
**Why this step exists:** final gate before real daily use begins.
**Features included:** none new — QA and hardening only.
**Database changes:** none, unless QA surfaces a defect requiring a migration (documented separately, not silently applied).
**UI changes:** bug fixes only.
**Dependencies:** Step 7 complete.
**What must already exist:** fully integrated app from Step 7.
**What this step must NOT touch:** scope — no new features introduced during QA.
**Acceptance criteria:** full Final Production Checklist (Part 13) passes.
**Testing requirements:** full regression across all modules, both layouts; RLS re-verified on every table; performance check (Home loads in a reasonable time with realistic data volume); production build succeeds.
**Definition of done:** see Part 14.

---

# PART 12 — ANTIGRAVITY EXECUTION PROTOCOL

### Implementation rule
Antigravity must **not** implement the entire Master PRD in one operation. It executes **one step at a time**, and only the step explicitly authorized by Souvik.

### At the beginning
1. Read the entire Master PRD to understand the full architecture.
2. Identify the currently authorized step.
3. Implement only that step.
4. Do not implement future steps, even partially.

### Step execution protocol
When Souvik says **"Start Step N,"** Antigravity must:
1. Read the Master PRD.
2. Read the Step N specification.
3. Inspect the existing project (code + schema).
4. Inspect the current database/schema state.
5. Reuse existing components where appropriate — do not rebuild what already works.
6. Implement Step N.
7. Run the application.
8. Test the implementation against Step N's acceptance criteria.
9. Fix discovered issues.
10. Verify acceptance criteria pass.
11. Perform a regression check against previously completed steps.
12. Report exactly what was completed.
13. Clearly state any remaining issues or deviations from spec.
14. **STOP.**

Antigravity does not start Step N+1 automatically.

### After step completion
Antigravity must state, verbatim in spirit:
> "Step N is implemented and verified. I have not started Step N+1."

Then wait. Souvik will explicitly say **"Start Step N+1"** before the next step begins. Repeat for every step.

### Never auto-advance
After completing a step, Antigravity must **not**: start the next step, pre-build future features, modify future architecture unnecessarily, implement unrequested modules, refactor unrelated areas, or add speculative features. Only changes necessary for the current authorized step (and essential foundations it depends on) are in scope.

### Existing work protection
Before modifying the project, Antigravity inspects the existing codebase first: **Inspect → Understand → Reuse → Modify → Test.** Never blindly overwrite existing implementation. If existing functionality conflicts with the PRD: identify the conflict, explain it, preserve working functionality where possible, make the minimum necessary change, and never destroy existing data without explicit confirmation.

### Quality gate after every step
Every step must pass before being considered complete:
- **Functional QA** — all acceptance criteria pass
- **UI QA** — desktop and mobile layouts both work
- **Database QA** — data saves and reads correctly
- **Security QA** — user data isolation (RLS) verified
- **Regression QA** — previously completed steps still work
- **Performance QA** — no obvious unnecessary performance problems
- **Error QA** — loading/error/empty states work as specified

---

# PART 13 — FINAL PRODUCTION CHECKLIST

- [ ] **Authentication** — sign up, login, logout, session persistence all work
- [ ] **Database** — all 9 tables exist with correct schema, constraints, and indexes
- [ ] **Security** — RLS verified on every table with a second test account
- [ ] **Daily Check-in** — full flow works, <60s, duplicate-safe, historical view works
- [ ] **Health** — all 4 views render correctly against real data
- [ ] **Finance** — expense CRUD, dashboard math, both V1 charts correct
- [ ] **Tasks** — CRUD, all 4 filters, priority defaults correctly
- [ ] **Projects** — CRUD, task linkage, "last updated" logic correct
- [ ] **Goals** — CRUD, category enforcement, Home snapshot logic correct
- [ ] **Profile** — all fields save and persist
- [ ] **Settings** — module toggles hide/show correctly, habit toggles work, theme toggle works, notification window works, export/delete work
- [ ] **Home** — full single-glance layout correct on both platforms, reflects live data from every module
- [ ] **Mobile** — bottom nav, FAB, touch targets, responsive layout all verified
- [ ] **Desktop** — sidebar, multi-column grid, hover states all verified
- [ ] **Accessibility** — WCAG AA contrast, keyboard navigation on desktop, screen-reader labels
- [ ] **Performance** — Home loads acceptably with realistic data volume (months of check-ins/expenses)
- [ ] **Error handling** — every write path has a defined failure/retry behavior
- [ ] **Data integrity** — no orphaned rows, no duplicate check-ins, FK behavior on project deletion verified
- [ ] **Responsive behavior** — verified at common breakpoints (375px, 768px, 1024px, 1440px)
- [ ] **Production build** — build succeeds cleanly, deployed and reachable

---

# PART 14 — DEFINITION OF DONE

Souvik OS V1 is complete when:
- All 9 approved modules work as specified
- All 12 core user flows (Part 4) work end-to-end
- Supabase data is reliable — no data loss, no duplicate records
- Authentication and RLS both work and are verified
- Daily Check-in works fully, including the sub-60-second target
- Home dashboard reflects real, live data from every module
- Mobile and desktop are both fully functional, first-class experiences
- Settings and feature toggles work correctly
- No critical bugs remain open
- Full regression testing (Part 13) passes
- Production build succeeds and is deployed

---

*End of Master PRD. Next action: Souvik authorizes Step 1 with "Start Step 1."*
