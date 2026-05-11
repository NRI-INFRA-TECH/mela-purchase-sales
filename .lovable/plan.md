## Roles & Access Model

Five roles, two of them new:

| Role | Access |
|---|---|
| `admin` (hardcoded — `admin@bazarmela.com`) | Everything: all sales, all vendors, manage all users, approve access requests |
| `executive_sales` (new) | View/edit **all** sales records; manage sales team membership |
| `executive_purchase` (new) | View/edit **all** vendor records; manage purchase team membership |
| `sales` (individual) | Own sales records only |
| `purchase` (individual) | Own vendor records only |

Only Admin can approve new access requests.

## Onboarding & Approval Flow

```text
Signup page (open)
   │  user picks: Sales / Purchase / Exec Sales / Exec Purchase
   ▼
Auth user created + profile.is_active = false
   │  + access_requests row (status = pending)
   ▼
User tries to log in → blocked with "Awaiting approval" message
   ▼
Admin opens Admin dashboard → "Access Requests" tab
   │  Approve → activates user, assigns role + team
   │  Reject  → marks request rejected, user stays inactive
   ▼
User logs in normally
```

The `admin@bazarmela.com / admin123` credentials remain hardcoded/seeded; admin is never created via the signup flow.

## Database Changes (migration)

1. Extend `app_role` enum: add `executive_sales`, `executive_purchase`.
2. New table `access_requests`:
   - `user_id` (FK to auth.users)
   - `requested_role`: `member` | `executive`
   - `requested_team`: `sales` | `purchase`
   - `status`: `pending` | `approved` | `rejected`
   - `reviewed_by`, `reviewed_at`, `notes`
   - RLS: users see their own; admin sees + manages all.
3. Replace `handle_new_user` trigger:
   - Always create profile with `is_active = false` for new signups.
   - Read `raw_user_meta_data.requested_role` / `requested_team`, insert into `access_requests`.
   - **Do not** auto-grant any role/team (existing seeded admin stays admin).
4. Update RLS on `sales_records`:
   - SELECT/UPDATE allowed if `created_by = auth.uid()` OR `is_admin()` OR `has_role(auth.uid(), 'executive_sales')`.
5. Update RLS on `vendor_records`: same with `executive_purchase`.
6. Update RLS on `user_teams` / `user_roles`: allow exec roles to manage their own team's membership.

## Frontend Changes

- **`/signup`** — add role selector (4 options); store choice in `signUp()` metadata; after signup, redirect to a "Pending approval" screen instead of dashboard.
- **`/login`** — after sign-in, check `profile.is_active`. If false → sign out + show "Your access request is pending admin approval."
- **`use-auth` hook** — expose `isExecSales`, `isExecPurchase`; treat any of the three as "elevated" for visibility of admin-only links.
- **Sidebar / dashboard nav** —
  - Admin: sees Sales, Purchase, Admin (all).
  - Exec Sales: sees Sales (all) + a limited Admin → Sales team mgmt.
  - Exec Purchase: same for Purchase.
  - Individuals: only their team page.
- **Admin dashboard** —
  - New **Access Requests** tab with Approve / Reject buttons (calls a server function using the admin client).
  - Existing **Team members** tab gets two new switches: Exec Sales, Exec Purchase.
  - Restrict the Admin route: allow admin / exec_sales / exec_purchase, but exec users only see their team's slice.

## Server Functions (admin client)

- `approveAccessRequest({ requestId })` — verifies caller is admin; sets `profiles.is_active = true`, assigns role + team based on the request, marks request approved.
- `rejectAccessRequest({ requestId, notes? })` — verifies caller is admin; marks request rejected.
- Existing `inviteUser` server function stays for direct admin-created accounts.

## Files Touched

- new migration
- `src/hooks/use-auth.tsx`
- `src/routes/signup.tsx` (+ new `/pending-approval` route)
- `src/routes/login.tsx` (gate on `is_active`)
- `src/routes/dashboard.admin.tsx` (Access Requests tab, exec switches)
- `src/routes/dashboard.tsx` (sidebar visibility per role)
- `src/lib/admin-users.functions.ts` (add approve/reject)

## Out of scope (this round)

- Sending email notifications to applicants on approve/reject (default Supabase email only).
- Granular per-record permission tweaks beyond what RLS gives execs.

Approve to proceed?
