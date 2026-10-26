# FR-13: Admin Dashboard

> Pool C - Web Admin (per HW02 group assignment).
> Source of truth: EShop System Requirements Specification (README.md, Section 6, FR-13),
> cross-checked against api_specification.md. Access is governed by FR-12 (admin-only).

## 1. Overview

The Admin Dashboard displays aggregate business metrics: total revenue and total
number of orders.

## 2. API Reference (verified against api_specification.md section 6.2)

- **Admin order data source:** `GET /api/admin/orders` (requires admin JWT).
- **Order status update:** `PUT /api/admin/orders/:id/status` with body
  `{ "status": "confirmed" }` (allowed: pending / confirmed / shipping / delivered /
  canceled).
- **Authentication/authorization:** all `/api/admin/*` endpoints require a valid JWT
  with `role = 'admin'` (see FR-12).
- **Base URL:** `http://localhost:3000`

> **Note:** the README/api_spec do not state a dedicated dashboard endpoint (e.g.
> `/api/admin/dashboard` or `/api/admin/stats`). The dashboard metrics may be computed
> client-side from `GET /api/admin/orders`, or there may be an unstated aggregate
> endpoint. Verify against the running backend before designing API-level tests - do
> not assume an endpoint that isn't confirmed. Record as an Open Question in Phase 1.

## 3. Functional Requirements

### 3.1 Total revenue
- The dashboard MUST display **total revenue**.
- Total revenue MUST be computed as the **sum of `total_amount` of orders whose
  `status = 'delivered'`** - and ONLY those orders.
- Orders in any other status (`pending`, `confirmed`, `shipping`, `canceled`) MUST NOT
  contribute to total revenue.

### 3.2 Total number of orders
- The dashboard MUST display the **total number of orders**.

### 3.3 Access control (per FR-12)
- The dashboard and its underlying admin APIs MUST be accessible only to accounts with
  `role = 'admin'`.
- A valid JWT alone is not sufficient; the token MUST carry `role = 'admin'`.

## 4. Inputs Summary (for test design)

| Input | Type | Constraint |
| --- | --- | --- |
| Requesting account role (in JWT) | enum | Must be `admin` to access; `user`/absent → denied |
| Order status (per order, drives revenue calc) | enum | pending / confirmed / shipping / delivered / canceled - only `delivered` counts toward revenue |
| `total_amount` per delivered order | number | Summed into total revenue |

## 5. Expected Outputs

- **Admin token:** dashboard shows total revenue (sum of `total_amount` where
  status = delivered) and total order count.
- **Order status = delivered:** included in revenue sum.
- **Order status != delivered:** excluded from revenue sum, but may still count in
  "total number of orders".
- **Non-admin token (`role = 'user'`):** access denied.
- **No token / invalid token:** access denied.

## 6. Test Data (from README / setup_guide defaults)

- Seeded admin: `admin@eshop.com` - the admin actor (README lists password `Admin123!`,
  setup_guide lists `admin123`; try both, record the inconsistency).
- Seeded normal user: `test@eshop.com` / `Test1234!` - the non-admin actor for the
  access-denied tests.
- To exercise revenue: create orders and move them through statuses via
  `PUT /api/admin/orders/:id/status` so you can verify only `delivered` orders sum into
  revenue and the others don't.

## 7. Not Specified in the FR (record as Open Questions in Phase 1 - do NOT assume)

- **Dashboard endpoint** - no dedicated stats endpoint is documented (see section 2 note).
- **"Total number of orders" scope** - is it ALL orders regardless of status, or only
  some? Section 3.2 says "total number of orders" without qualifying by status; section
  5 implies non-delivered orders "may still count", but this is not stated definitively.
- **Empty state** - what revenue/count shows when there are zero orders (0? blank?).
- **Revenue when zero delivered orders** - revenue = 0, or empty/undefined?
- **canceled orders and total_amount** - a canceled order still has a `total_amount`;
  confirm it is excluded from revenue (it should be, per 3.1) AND decide whether it
  counts in "total number of orders".
- **total_amount trustworthiness** - api_spec section 4.3 lets the client supply
  `total_amount` at checkout, contradicting README FR-08 (backend must recompute). So
  the summed revenue may be built on client-controlled values - a real correctness/
  security concern worth checking during execution.
- **Currency / rounding / number format** of the displayed revenue.
- **Denied response shape** - 401 (no/invalid token) vs 403 (valid token but role=user);
  section 5 only says "access denied".
- **Number precision** - is `total_amount` an integer (VND) or a decimal? Affects
  whether BVA on the revenue sum needs a step of 1 or 0.01.