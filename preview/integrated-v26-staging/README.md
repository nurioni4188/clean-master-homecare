# Clean Master RC16 — DESIGN LOCKED, Staging integration candidate
**Base:** EXACT 2번 UI `9545e3e7714acc78879308b0680870252bf73ec8`
**Protected:** `preview/integrated-v1/index.html` MUST NOT CHANGE, verified by Git blob SHA `0e405d7646efd502b20606a1a8c251524c30070f`.
**Derivative only:** `preview/integrated-v26-staging/`. Inherits hero cinema, marketing cards, price guide and browser-only consultation helper from 2번, replacing in-memory demo actions with separate authenticated test workflows.
**Back end:** `clean-master-ops-staging` Supabase (24 public tables; 6 historical migrations). Browser uses only publishable key and `auth.uid()` scoped RLS. No production key.
**Environment:** Copy `.env.example` to `.env.local`, fill ONLY Supabase Staging URL and publishable key. `VITE_CM_SYNTHETIC_WRITES=OFF` by default.
**Execution:** `cd preview/integrated-v26-staging && npm install && npm test && npm run build` (package versions pinned; lockfile must be reviewed and committed BEFORE deployment). Do not deploy with unresolved dependency lock or real customer data.
**Deployment:** Target a NEW Vercel protected Staging Preview, never existing homecare Production or original integrated Preview. Require project identity and protection check. This branch itself is not deployment approval.
**Critical HOLD:** No real test users/memberships, no active approved 2/4 plans, no real JWT 6-role cross-org UAT, no PG charges. This is SOURCE implementation, not completed commercial service.
**UI fidelity:** Marketing hero DOM/CSS comes directly from immutable 2번 source; the below-the-fold authenticated workflow is a derivative whose pixel-perfect desktop/mobile comparison still needs browser UAT. Never call it exact visual PASS until checked.
