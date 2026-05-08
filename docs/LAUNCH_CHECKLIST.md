# REDtech System Automations Launch Checklist

Purpose: brutal go-live checklist for internal rollout, live team testing, and production confidence.

Use this as the single sign-off sheet before telling the whole company to rely on the platform daily.

## Sign-Off Rules

- [ ] Do not mark a page "ready" because it looks correct. Mark it ready only after the data, buttons, role guards, empty states, and refresh behavior all pass.
- [ ] Every page must be tested in at least 4 roles: `super_admin`, `admin`, `team_member`, `viewer`.
- [ ] Every create flow must be tested with valid data, invalid data, missing data, cancel flow, and duplicate/retry flow.
- [ ] Every edit flow must be tested for persistence after refresh and after sign-out/sign-in.
- [ ] Every destructive flow must be tested for both confirmation behavior and actual database result.
- [ ] Every chart/KPI page must be compared against raw Supabase data, not trusted visually.
- [ ] Every file upload/download flow must be checked in both the database row and the storage bucket.
- [ ] Every notification flow must be checked for insert, badge update, toast, mark-as-read, and correct deep-link behavior.
- [ ] Every gated page must be tested for both access allowed and access denied cases.
- [ ] If any item fails, log the exact route, role, action, and DB table involved before fixing.

## Current Verification Snapshot

- [x] Current audited commit: `a353fad`
- [x] Working tree clean during audit
- [x] `npx tsc --noEmit` passed
- [x] `npm run build` passed
- [x] Mixed static/dynamic import warning for `supabase/client` — not present in actual build output (Codex precautionary note, confirmed non-issue)
- [x] `vendor-misc` chunk split: 750 kB → 578 kB (195 kB gzip). No chunk warning in production build.

## Release Gates

- [ ] Production Supabase project schema matches repo migrations exactly
- [ ] Required storage buckets exist and are writable/readable with expected RLS
- [ ] Required edge functions are deployed and callable in production
- [ ] Required cron jobs exist and are active in production
- [ ] Platform settings table has valid live defaults
- [ ] Module toggles table and per-user overrides contain sane production values
- [ ] Demo mode is off before broad live rollout
- [ ] Production test accounts exist for each role
- [ ] Error monitoring/log review process is agreed before rollout
- [ ] Backup/restore plan exists for production tables and storage

## Role Matrix

### Super Admin

- [ ] Can access all pages from sidebar and direct URL
- [ ] Can use module manager and see module changes reflected immediately
- [ ] Can access user management, staff utilisation, platform settings, activity log, and email outbox
- [ ] Can create, edit, deactivate, and review users safely
- [ ] Can still use regular team flows without permission regressions

### Admin

- [ ] Can access business and allowed admin pages only
- [ ] Cannot access super-admin-only surfaces if those are intentionally restricted
- [ ] Can approve/reject leave, review attendance, and use allowed ops/finance/document flows
- [ ] Cannot bypass module restrictions by direct URL if disabled

### Team Member

- [ ] Sees only enabled modules in sidebar and dashboard hub
- [ ] Can create/edit only the records permitted by role
- [ ] Cannot access user management, platform settings, email outbox, or restricted admin controls
- [ ] Receives notifications and sees profile/presence behavior correctly

### Viewer

- [ ] Can sign in and view allowed pages without mutation controls
- [ ] Viewer restriction banners and upgrade request flows work
- [ ] Hidden edit/delete/create actions are truly blocked, not just visually muted
- [ ] Direct URL access to restricted pages redirects safely

## Shared System Checks

### App Shell, Routing, and Guards

- [ ] All routes in `src/App.tsx` load without white screen or stuck loader
- [ ] Authenticated users never see empty protected pages caused by session race
- [ ] Disabled modules redirect away through `ModuleGuard`
- [ ] Unknown routes render the 404 page correctly
- [ ] Sidebar links and direct URLs land on the same page behavior

### Sidebar, Footer, and Navigation

- [ ] Sidebar collapse/expand state works and persists safely
- [ ] Footer show/hide state works and persists safely
- [ ] Clicking profile card opens `/profile`
- [ ] Storage box numbers are truthful against real storage usage
- [ ] Replay tour button works without corrupting app state
- [ ] Theme toggle works without breaking charts or dialogs
- [ ] Logout always clears session and redirects to `/auth`

### Header and Notifications

- [ ] Notification bell shows unread count accurately
- [ ] New notification insert triggers realtime toast
- [ ] Toast action deep-links to the correct page
- [ ] Mark all read updates UI and DB correctly
- [ ] Notification list refreshes correctly after page reload
- [ ] Feedback form submits to the intended backend path and succeeds visibly

### AI Assistant

- [ ] Opens, closes, and preserves chat history correctly
- [ ] Creates or suggests actions only on valid routes
- [ ] Task shortcuts use live task data, not stale assumptions
- [ ] AI action parsing does not silently fail on malformed payloads
- [ ] History save/reload works after full refresh

### Global Attendance Popup

- [ ] Popup appears only when intended
- [ ] Work mode selection persists correctly
- [ ] Dismiss behavior does not trap users in repeated prompts
- [ ] It does not conflict with attendance page actions

### Presence and Realtime

- [ ] Presence indicators match `presence_visible_to_all` setting
- [ ] Realtime invalidation updates tasks, leave, attendance, and notifications correctly
- [ ] Multi-tab behavior does not duplicate notifications or stale counts

### Files, Storage, and Document Sending

- [ ] Upload path writes file to the right bucket/path
- [ ] Database record stores matching storage URL/path/size/type
- [ ] Download actions retrieve the expected file
- [ ] Preview actions use correct file type handling
- [ ] Send Document modal generates the PDF/attachment correctly
- [ ] Email queue receives send-document jobs when expected

### Demo Mode

- [ ] Demo mode is disabled for production rollout
- [ ] No audit-style view uses fake rows when demo mode is off
- [ ] Team understands which surfaces can still show sample data if demo mode is enabled

## Auth and Session

### `/auth`

- [ ] Email/password sign-in works
- [ ] Sign-up flow works with allowed domain rules
- [ ] Forgot-password/reset flow works
- [ ] Invalid credentials show a clear error
- [ ] Session survives page refresh
- [ ] Logout from sidebar returns cleanly to auth

## Dashboard and Core Hub

### `/`

- [ ] KPI cards match actual source tables
- [ ] Activity feed rows match real activity timestamps and descriptions
- [ ] Module-aware app hub hides disabled modules correctly
- [ ] Role-aware content does not expose restricted actions
- [ ] Task donut totals match raw task status counts
- [ ] Revenue and efficiency widgets are validated against DB queries

## Revenue and Documents

### `/invoice`

- [ ] Invoice form validates required fields
- [ ] Known client autofill works correctly
- [ ] VAT, totals, bank details, notes, and optional services calculate correctly
- [ ] Live preview matches generated PDF
- [ ] Generate action writes transaction row correctly
- [ ] Generate action writes document row correctly
- [ ] PDF upload lands in storage and opens successfully
- [ ] Client sync updates CRM data correctly
- [ ] Send invoice modal generates attachment and enqueues email correctly

### Invoice Dashboard inside `/invoice`

- [ ] Ledger rows come from live data only
- [ ] View PDF opens correct file
- [ ] Download fetches correct file
- [ ] Top clients, outstanding bars, currency split, and velocity reflect source data
- [ ] Search and filters work correctly

### `/waybill`

- [ ] Waybill form validates required fields
- [ ] Known recipient autofill works
- [ ] Generate action writes transaction row correctly
- [ ] Generate action writes document row correctly
- [ ] PDF upload lands in storage and opens successfully
- [ ] Recipient sync behaves correctly after creation
- [ ] Preview/edit toggle does not lose form state

### `/documents`

- [ ] Dashboard counts match the documents table
- [ ] Department hubs are built from live documents only
- [ ] Search works by filename and metadata
- [ ] Filters work by department/type/status
- [ ] In-app preview works for images, links, PDFs, and office files where supported
- [ ] External open/download actions work
- [ ] Delete action removes correct DB row and file if intended
- [ ] Add link flow saves correctly and displays in the correct place
- [ ] Department access controls are enforced

## Client and Relationship Management

### `/clients`

- [ ] Client create flow saves all expected fields
- [ ] Edit flow persists on refresh
- [ ] Delete flow removes the correct client
- [ ] Search, filters, and "my clients" toggle behave correctly
- [ ] Export output matches filtered dataset
- [ ] Drawer details match DB values
- [ ] Last contact update behaves correctly
- [ ] Analytics/KPIs match client source data

### `/team`

- [ ] Directory search works by name/email/title/department
- [ ] Department and role filters behave correctly
- [ ] Presence/status display is correct per permissions
- [ ] Profile cards do not expose hidden data to wrong roles

### `/partnerships`

- [ ] Agreement number generation is acceptable for production uniqueness
- [ ] Form state updates every clause/field correctly
- [ ] Preview matches exported PDF
- [ ] Export creates the intended file
- [ ] Saved document row is correct if persisted
- [ ] Reset fully clears local state safely

## Work Management

### `/tasks`

- [ ] Task create flow works with assignee, department, due date, priority, and subtasks
- [ ] Edit flow persists correctly
- [ ] Delete flow removes task correctly
- [ ] Status changes update UI and DB immediately
- [ ] Subtask add/toggle flows persist correctly
- [ ] Blocker note flow writes notes and triggers notifications/emails correctly
- [ ] Board, grid, and list views all show consistent task counts
- [ ] Search and filters return correct subsets
- [ ] Empty states behave correctly for each role

### `/leave`

- [ ] Leave request creation validates dates, balance, and leave type
- [ ] AI assist does not create broken or partial requests
- [ ] Approved/rejected states update correctly
- [ ] Rejection modal captures reason and persists it
- [ ] Credit extra leave days works for allowed roles only
- [ ] Team leave balances are mathematically correct
- [ ] My leave vs team leave views remain consistent after refresh
- [ ] Leave notifications fire to the right users

### `/attendance`

- [ ] Clock in writes correct time, mode, and note
- [ ] Clock out writes correct time and early-leave logic
- [ ] Shift config is respected
- [ ] Personal attendance metrics match raw attendance records
- [ ] Weekly heatmap and history match actual records
- [ ] Team/admin attendance views enforce role restrictions
- [ ] Attendance automations/report actions behave correctly if enabled

### `/utilisation`

- [ ] Staff loading metrics match live tasks and attendance data
- [ ] Department scores and rankings are truthful
- [ ] Reallocation flow updates the correct profile department
- [ ] Crash boundaries recover gracefully if a widget fails
- [ ] AI summary card content matches source task data

## Business Operations

### `/finance-dashboard`

- [ ] Transaction create flow writes correct type/category/date/amount
- [ ] Delete/archive/recycle-bin flows behave correctly
- [ ] Payment request submission works and notifies approvers
- [ ] Approve/reject payment request flow updates status correctly
- [ ] Budget creation and display are correct
- [ ] CSV/XLSX export matches filtered period and values
- [ ] All KPI cards match source transactions and requests
- [ ] All finance charts are validated against actual transaction aggregates
- [ ] Empty states are honest when no data exists

### `/ops-dashboard`

- [ ] Ops metric logging works
- [ ] Delete metric removes correct record
- [ ] KPI row uses real data only
- [ ] Spending breakdown comes from real expense transactions
- [ ] Strategic yield bars come from real ops metrics
- [ ] Tracking table expands/collapses correctly
- [ ] Individual performance table is built from real task/profile data
- [ ] Export report output matches the visible dataset

### `/social`

- [ ] Post creation works for each platform/post type
- [ ] Image upload stores the right files and URLs
- [ ] Blob preview URLs are cleaned up and not persisted accidentally
- [ ] Edit flow retains existing uploaded images correctly
- [ ] Approve/publish status actions update DB correctly
- [ ] Delete flow removes only the intended post
- [ ] Calendar/week navigation matches scheduled dates
- [ ] Preview modal matches stored post content/media
- [ ] Tagged-user data and schedule metadata persist correctly

## Administration

### `/users`

- [ ] Only allowed roles can access the page
- [ ] New user creation creates Auth user and profile consistently
- [ ] Default password and custom password flows behave correctly
- [ ] Edit user flow updates profile, role, department, work mode, and work days correctly
- [ ] Self-demotion protection works for super admins
- [ ] Deactivate/remove flow behaves exactly as intended and preserves audit expectations
- [ ] Global notification broadcast sends to correct target audience
- [ ] Module override modal persists and enforces per-user module rules
- [ ] Shift config save works and affects attendance correctly
- [ ] Department creation works
- [ ] Department deletion is tested against assigned-user edge cases
- [ ] Data wipe flow is disabled or tightly controlled in production
- [ ] Demo mode toggle is off for launch

### `/platform-settings`

- [ ] Company name, description, logo, accent, and currency persist correctly
- [ ] Default storage quota saves correctly
- [ ] `allow_user_emails` is enforced by send flows
- [ ] `presence_visible_to_all` is enforced by presence UI
- [ ] `storage_alerts_enabled` is enforced by storage alert logic
- [ ] Only allowed roles can change settings

### `/activity`

- [ ] Activity log is real-only in production
- [ ] Scope switch between mine/all works correctly
- [ ] Search and action filters work correctly
- [ ] Export CSV matches the visible filtered rows
- [ ] File sizes, timestamps, and actor labels are accurate

### `/email-outbox`

- [ ] Page is restricted to intended admin roles
- [ ] Pending/sent/dlq counts match `email_outbox`
- [ ] Search works by subject/recipient/error
- [ ] Retry resets the correct fields and requeues correctly
- [ ] Delete removes the correct outbox row
- [ ] Drain-now action calls the intended worker path
- [ ] Sent status, last error, attempts, and next-attempt values are accurate

## Profile and Self-Service

### `/profile`

- [ ] Avatar upload writes correct file and `avatar_url`
- [ ] Avatar change is visible in sidebar/profile without brittle reload behavior
- [ ] Edit name/department flow persists correctly
- [ ] Notification stats match the notifications table
- [ ] Attendance/task/leave performance values match source data
- [ ] Task completion scoring uses the same status normalization as the rest of the app
- [ ] Viewer/admin upgrade request flows work if applicable

## Auxiliary Checks

### Error, Empty, and Offline States

- [ ] Every major page has a truthful empty state
- [ ] Retry buttons actually re-run the intended query
- [ ] Offline banner behavior is sane and non-destructive
- [ ] Error boundaries show recoverable UI where expected

### Exports and Downloads

- [ ] CSV export on activity, clients, tasks, finance, and ops matches filtered UI state
- [ ] PDF downloads open valid files
- [ ] Browser download names are sensible and unique

### Numbers and Truthfulness

- [ ] No KPI falls back to fabricated business values
- [ ] No chart uses random values or static executive numbers in production views
- [ ] Derived metrics are documented and accepted where exact source values do not exist
- [ ] Currency formatting is consistent across dashboards and exports

### Performance and Build Hygiene

- [ ] Investigate mixed static/dynamic import warning for `supabase/client`
- [ ] Investigate large `vendor-misc` chunk
- [ ] Confirm initial route load and lazy-route transitions feel acceptable on real team devices

## Final Go/No-Go Questions

- [ ] Can a super admin run the company from this for one full day without using SQL or the Supabase dashboard as a crutch?
- [ ] Can an admin manage people, leave, attendance, and operations without hitting blocked flows?
- [ ] Can a team member complete their daily work without seeing broken or deceptive data?
- [ ] Can a viewer safely observe without mutating anything?
- [ ] If a new file, task, leave request, client, invoice, or notification is created, does every downstream page reflect it correctly?
- [ ] If the answer is "yes" to all of the above, approve internal live rollout.

