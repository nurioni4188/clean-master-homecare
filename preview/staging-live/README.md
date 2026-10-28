# Clean Master — Authenticated Staging Journey (RC15 candidate)

**Status: SOURCE ONLY / actual Auth+RLS E2E HOLD / Production deployment NOT approved.**

This is an **isolated Staging Vite app**, not a replacement for `index.html` or `preview/integrated-v1/index.html`. It is a functional customer/admin source implementation with real Supabase Auth and RPC calls, but it is deliberately fail-closed until the test environment is provisioned. Do not mix real users with simulated customer names.

## Connected workflows

- Auth: approved, pre-provisioned test users only, `signInWithOtp({ shouldCreateUser:false })`.
- Booking: server-supplied `service_catalog` → `create_booking` RPC → `bookings` → authenticated customer history.
- Subscription: server-approved active priced `cm_subscription_plans` → `cm_request_subscription` RPC → `pending_payment`, never paid/active on the client.
- My page: bookings, subscriptions, billing cycles, reserved visits under RLS; customer-initiated cancellation via `cm_cancel_subscription`.
- Administrator: server membership admin, booking status confirm/reject and explicit staff selection for assignment through `booking_action`; subscription list is read-only.
- Design: black/white editorial style, pastel lime/lilac/navy sections, mobile layouts.

The `src/live-api.js` adapter is copied from private Clean Master ops RC15 development branch (2026-10-28), not the original RAM-only Preview.

## Local safety setup (Windows or macOS/Linux)

1. Use a **separate clone/branch**. In `preview/staging-live` copy `.env.example` to `.env.local`.
2. Provide only **Staging project URL and public publishable key**. Never insert service_role, secret keys, billing or production variables into browser/Vite environment.
3. Set `VITE_CM_ENV_LABEL=CLEAN_MASTER_STAGING` and keep `VITE_CM_SYNTHETIC_WRITES=OFF` until synthetic users and RLS tests are approved.
4. Run `npm install` to create the pinned dependency lockfile in this directory, then `npm run test`, `npm run build`, `npm run dev`. **No dependency install/build was executed from this connector environment.** Review/commit the generated lockfile before any deployment.
5. For approved synthetic Staging *only*, set `VITE_CM_SYNTHETIC_WRITES=ON`. Address must begin `TEST `; optional note must begin `TEST`. Never use real addresses or contact details.
6. Supabase Auth email redirect allowlist must include the isolated, protected Staging origin; pre-provision accounts and matching `profiles/memberships/customers/cleaners` server-side. There are currently no memberships, customers, service catalog, or active plans to exercise the UI.
7. Build output `dist/` belongs on a **new isolated, protected Vercel Preview project**, not existing `clean-master-homecare` Production. Keep Access Protection/noindex/no-store. Deploying source without build and approval is HOLD.

## Known HOLD items

- Actual Supabase JWT/RLS 6-role tests, including cross-organization boundary, customer A/B isolation and admin permission.
- Supabase database is populated with no production users; add synthetic catalog + monthly 2/4 plans *only after* access control review.
- Subscription checkout, payment gateway MID, webhook signature verification, refunds, recurring billing and paid status are deliberately absent.
- No actual customer enrollment, contracts/privacy information or production operations.
- Vercel staging deployment, environment variables and mobile E2E remain unverified.
- Supabase SECURITY DEFINER advisor warnings require review and justified execution grants.

## Acceptance path

**Synthetic Auth → customer booking → persisted booking → admin confirmation/assignment → customer refreshed booking → subscription pending-payment → customer subscription/history/cancellation → cross-org denial.**

Only after this passes on real Staging JWT with stable CI do we prepare real PG TEST checkout and Production readiness. No implicit approval.
