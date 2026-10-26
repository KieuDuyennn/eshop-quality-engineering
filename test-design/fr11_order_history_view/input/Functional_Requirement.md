# FR-11: Order History View (User)

> Pool B - Shopping Cart and Checkout (per HW02 group assignment).
> Source of truth: EShop System Requirements Specification (README.md, Section 5, FR-11),
> cross-checked against api_specification.md.

## 1. Overview

A logged-in user can view the history of their own orders. Each order shows summary
information, and the status is displayed in Vietnamese with color coding.

## 2. API Reference (verified against api_specification.md)

- **List own orders:** `GET /api/orders/my-orders`
- **Get one order detail:** `GET /api/orders/:id`
- **Authentication:** required - header `Authorization: Bearer <token>`
  (api_specification.md section 4: Cart & Orders APIs require the token).
- **Base URL:** `http://localhost:3000`

**Related endpoints (not part of FR-11, but useful to set up test state):**
- `PUT /api/orders/:id/cancel` - moves an order to `canceled`; use it to produce a
  `canceled` order so FR-11's status display (Vietnamese + color) can be tested.
- `POST /api/checkout` - creates an order (needed to have any history to view).

## 3. Functional Requirements

### 3.1 Ownership restriction
- A user MUST be able to view **only their own orders**.
- A user MUST NOT be able to view another user's orders.

### 3.2 Displayed fields
Each order in the history MUST display:
- **Order ID**
- **Order date**
- **Total amount** (README field: `total_amount`)
- **Current status**

### 3.3 Status presentation
- The order status MUST be translated into clear **Vietnamese**.
- Statuses MUST be visually distinguished by **color**.
- The five possible statuses (from the FR-10 state machine) are: `pending`,
  `confirmed`, `shipping`, `delivered`, `canceled`.

## 4. Inputs Summary (for test design)

| Input | Type | Constraint |
| --- | --- | --- |
| Authenticated user (JWT token) | token | Required; identifies whose orders are returned |
| Order id (for detail view, `GET /api/orders/:id`) | integer | Must belong to the requesting user |
| Order status (value being displayed) | enum | One of: pending / confirmed / shipping / delivered / canceled |

## 5. Expected Outputs

- **Authenticated user, own orders:** list of that user's orders with id, date, total,
  status (status shown in Vietnamese + color).
- **Request another user's order id:** MUST be denied / not returned (ownership rule).
- **No token / invalid token:** request rejected (unauthorized).
- **User with no orders:** an appropriate empty state.

## 6. Test Data (from README / setup_guide defaults)

- Seeded normal user: `test@eshop.com` / `Test1234!` - the "own orders" actor.
- Seeded admin: `admin@eshop.com` - a *different* account for creating an order under a
  second identity (ownership / cross-user tests). Note: README lists the password as
  `Admin123!` while setup_guide.md lists `admin123`; try both, and record the
  inconsistency as an observation.
- To create order history: log in, add to cart (`POST /api/cart`), checkout
  (`POST /api/checkout`), and (optionally) cancel (`PUT /api/orders/:id/cancel`) to get
  orders in different statuses.

## 7. Not Specified in the FR (record as Open Questions in Phase 1 - do NOT assume)

The README/FR do not state the following; each must be raised as an Open Question and
must not be silently assumed during test design:

- **Order date format** (locale, timezone, date vs datetime).
- **Total amount** - whether it is shown before or after any applied coupon discount.
  Extra caution: api_specification.md section 4.3 shows `POST /api/checkout` accepting a
  client-supplied `total_amount`, which contradicts README FR-08 ("backend must
  recompute; do not trust client total_amount") - so the stored/displayed total may be
  unreliable. Worth checking during execution.
- **List sort order** (e.g. newest-first) and deterministic tie-breaking.
- **Pagination / result limit** when a user has many orders.
- **Exact color** mapping per status (README only says "distinguished by color").
- **Denied response for another user's order** - whether `GET /api/orders/:id` on an
  order owned by someone else returns 403 (Forbidden) or 404 (Not Found, to hide
  existence). Section 5 only says "denied / not returned".
- **Unauthorized response shape** - status code/body for missing vs malformed token.
- **Vietnamese label text** - the exact Vietnamese string for each of the five statuses
  is not given in the FR.