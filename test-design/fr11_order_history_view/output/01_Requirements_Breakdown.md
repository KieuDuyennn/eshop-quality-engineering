# FR-11: Order History View (User) - Requirements Breakdown (Phase 1)

Source: `input/Functional_Requirement.md` (FR-11: Order History View, Pool B -
Shopping Cart and Checkout).

## 0. Global Precondition (not repeated per requirement)

All requirements below (except AREA-06, which covers the *failure* of this
precondition) assume the request carries a valid JWT, i.e. `Authorization: Bearer
<token>` for a user already authenticated per FR-02. This precondition is stated
once here and is not restated in each REQ row.

## 1. Feature Areas

| Area ID | Name | Description |
| --- | --- | --- |
| AREA-01 | Authentication Requirement | The Bearer-token requirement itself (that both endpoints demand it) |
| AREA-02 | API Contract | Endpoint paths and base URL for the two FR-11 endpoints |
| AREA-03 | Ownership Restriction | Own orders visible; another user's orders denied/not returned |
| AREA-04 | Displayed Fields | The four fields each order must show |
| AREA-05 | Status Presentation | Vietnamese translation, color coding, the five status values |
| AREA-06 | Unauthorized Access | Behavior when the Bearer token is missing or invalid |
| AREA-07 | Empty State | Behavior when the user has no orders |
| AREA-08 | Test Setup Data | Seed accounts and helper endpoints used to produce order history (not FR-11 behavior itself) |
| AREA-09 | Documentation Metadata | The input file's pool/category labeling vs. README's own FR placement (documentation-level only, no direct test-design impact) |

## 2. Atomic Requirements

| REQ ID | Area | Statement | Source Reference | Classification |
| --- | --- | --- | --- | --- |
| REQ-01 | AREA-01 | `GET /api/orders/my-orders` MUST require authentication via header `Authorization: Bearer <token>`. | §2 "Authentication: required - header `Authorization: Bearer <token>`" (applies to "List own orders: `GET /api/orders/my-orders`") | Functional Requirement |
| REQ-02 | AREA-01 | `GET /api/orders/:id` MUST require authentication via header `Authorization: Bearer <token>`. | §2 "Authentication: required - header `Authorization: Bearer <token>`" (applies to "Get one order detail: `GET /api/orders/:id`") | Functional Requirement |
| REQ-03 | AREA-02 | The "list own orders" endpoint is `GET /api/orders/my-orders`. | §2 "List own orders: `GET /api/orders/my-orders`" | Functional Requirement |
| REQ-04 | AREA-02 | The "get one order detail" endpoint is `GET /api/orders/:id`. | §2 "Get one order detail: `GET /api/orders/:id`" | Functional Requirement |
| REQ-05 | AREA-02 | The base URL for both endpoints is `http://localhost:3000`. | §2 "Base URL: `http://localhost:3000`" | Observation |
| REQ-06 | AREA-03 | A user MUST be able to view only their own orders (via `GET /api/orders/my-orders`). | §3.1 "A user MUST be able to view only their own orders." | Functional Requirement |
| REQ-07 | AREA-03 | A user MUST NOT be able to view another user's orders. | §3.1 "A user MUST NOT be able to view another user's orders." | Functional Requirement |
| REQ-08 | AREA-03 | For `GET /api/orders/:id`, the requested order id MUST belong to the requesting user; if it belongs to a different user, the request MUST be denied / the order MUST NOT be returned. | §4 Inputs Summary - Order id: "Must belong to the requesting user"; §5 "Request another user's order id: MUST be denied / not returned (ownership rule)." | Functional Requirement |
| REQ-09 | AREA-04 | Each order in the history MUST display Order ID. | §3.2 "Each order in the history MUST display: Order ID"; §5 first bullet | Functional Requirement |
| REQ-10 | AREA-04 | Each order in the history MUST display Order date. | §3.2 "Order date"; §5 first bullet | Functional Requirement |
| REQ-11 | AREA-04 | Each order in the history MUST display Total amount (field `total_amount`). | §3.2 "Total amount (README field: `total_amount`)"; §5 first bullet | Functional Requirement |
| REQ-12 | AREA-04 | Each order in the history MUST display Current status. | §3.2 "Current status"; §5 first bullet | Functional Requirement |
| REQ-13 | AREA-05 | The displayed order status MUST be translated into Vietnamese. | §3.3 "The order status MUST be translated into clear Vietnamese." | Functional Requirement |
| REQ-14 | AREA-05 | The displayed order status MUST be visually distinguished by color. | §3.3 "Statuses MUST be visually distinguished by color." | Functional Requirement |
| REQ-15 | AREA-05 | The order status value is one of exactly five enumerated values: `pending`, `confirmed`, `shipping`, `delivered`, `canceled`. Note: status is a displayed output value for these two GET endpoints, not a user-submitted input parameter. | §3.3 "The five possible statuses ... are: pending, confirmed, shipping, delivered, canceled."; §4 Inputs Summary - Order status enum | Functional Requirement |
| REQ-16 | AREA-06 | If no token is provided to either endpoint, the request MUST be rejected (unauthorized). | §5 "No token / invalid token: request rejected (unauthorized)." (no-token clause) | Functional Requirement |
| REQ-17 | AREA-06 | If an invalid token is provided to either endpoint, the request MUST be rejected (unauthorized). | §5 "No token / invalid token: request rejected (unauthorized)." (invalid-token clause) | Functional Requirement |
| REQ-18 | AREA-07 | If a user has no orders, `GET /api/orders/my-orders` MUST return an appropriate empty state. | §5 "User with no orders: an appropriate empty state." | Functional Requirement |
| REQ-19 | AREA-08 | `PUT /api/orders/:id/cancel` and `POST /api/checkout` are not part of FR-11's own behavior but are the mechanisms used to set up order history (create an order; move it to `canceled`) for testing. | §2 "Related endpoints (not part of FR-11, but useful to set up test state)" | Observation |
| REQ-20 | AREA-08 | Test data uses seeded accounts `test@eshop.com` / `Test1234!` (the "own orders" actor) and `admin@eshop.com` (a different account for cross-user/ownership tests); the admin password is inconsistent between sources - README states `Admin123!`, setup_guide.md states `admin123` - both should be tried. | §6 "Note: README lists the password as `Admin123!` while setup_guide.md lists `admin123`; try both, and record the inconsistency as an observation." | Observation |
| REQ-21 | AREA-08 | The five status values are stated to originate from "the FR-10 state machine," an external requirement not included in this FR-11 input file. | §3.3 "The five possible statuses (from the FR-10 state machine)" | Observation |
| REQ-22 | AREA-09 | The input file's header labels FR-11 as "Pool B - Shopping Cart and Checkout," but README.md Section 5 places FR-11 under order management. No impact on test design - flagged for TA clarification. | Input file header (lines 1-5): "Pool B - Shopping Cart and Checkout (per HW02 group assignment)... Source of truth: EShop System Requirements Specification (README.md, Section 5, FR-11)..." | Observation |

## 3. Assumptions

None identified. Per session rules, ambiguous or unstated behavior is recorded
under Open Questions (Section 4) instead of being assumed.

## 4. Open Questions

Items OQ-01 through OQ-08 are taken directly from §7 of the input ("Not
Specified in the FR") - none of these are answered or guessed here. OQ-09
through OQ-12 are additional gaps identified during decomposition, each with
supporting evidence.

| ID | Question | Why It Matters | Evidence |
| --- | --- | --- | --- |
| OQ-01 | What is the order date format (locale, timezone, date-only vs. datetime)? | Needed to define valid/invalid output equivalence classes for the date field in Phase 2. | §7 bullet 1 |
| OQ-02 | Is Total amount shown before or after any applied coupon discount? Does the backend actually recompute it, or can a client-supplied `total_amount` (per api_specification.md §4.3) make the stored/displayed value unreliable, contradicting README FR-08? | Affects whether "total amount" can be treated as a trustworthy, single-valued output for test design, or whether a discrepancy test is warranted. | §7 bullet 2 |
| OQ-03 | What is the list's sort order (e.g., newest-first) and its tie-breaking rule? | Needed if any test case asserts on list ordering. | §7 bullet 3 |
| OQ-04 | Is there pagination or a result limit when a user has many orders? | Affects equivalence classes / boundary values for "number of orders" in later phases. | §7 bullet 4 |
| OQ-05 | What is the exact color mapping per status? | REQ-14 requires color distinction but no mapping is given; without it, color can only be tested for "is distinguished," not for a specific expected value. | §7 bullet 5 |
| OQ-06 | For `GET /api/orders/:id` on another user's order, is the denial a 403 (Forbidden) or 404 (Not Found)? | Determines the expected HTTP status code to assert in the ownership-denial test case (REQ-08). | §7 bullet 6 |
| OQ-07 | What is the unauthorized response shape (status code/body) for a missing token vs. a malformed/invalid token - are they the same or different? | Determines whether "no token" and "invalid token" produce the same or different responses (REQ-16, REQ-17 are now split as separate input conditions; this OQ is about whether their *output* also differs). | §7 bullet 7 |
| OQ-08 | What is the exact Vietnamese label text for each of the five statuses? | REQ-13 requires Vietnamese translation but gives no strings; without them, expected-output assertions for status text cannot be made precise. | §7 bullet 8 |
| OQ-09 | What HTTP status code is returned on a successful list or detail response? | §5 describes the *content* of successful responses ("list of that user's orders with id, date, total, status") but never states a status code (e.g., 200) for either endpoint, for either REQ-06/REQ-08 success paths. | §5 first bullet; §2 (no status code given anywhere for the success path) |
| OQ-10 | What is the exact response body shape/envelope for `GET /api/orders/my-orders` - a raw JSON array of order objects, or a wrapped object (e.g., `{ "orders": [...] }`), and does it include a count/total field? | Needed to write concrete expected-result assertions in Phase 3/4 test cases; without a sample body, only field-level content (not structure) can be verified. | §5 first bullet gives field names only, no sample JSON (contrast with other FRs in this repo, e.g. FR-01 §2, which include a sample response body) |
| OQ-11 | Do the four fields in §3.2 apply identically to both endpoints, or may `GET /api/orders/:id` return additional fields (e.g., line items) beyond Order ID / date / total / status? | §3.2 is worded generally under "order history" without distinguishing the list endpoint from the detail endpoint; affects whether REQ-09-REQ-12 fully specify the detail endpoint's response or only the list's. | §1 Overview (general "order history" framing) + §2 (two distinct endpoints) + §3.2 (fields stated without endpoint qualification) |
| OQ-12 | For `GET /api/orders/:id`, does requesting a **nonexistent** order id (one not owned by anyone, or out-of-range/malformed) behave the same as requesting another user's real order id (REQ-08), or differently? | §5 only addresses the case of an order that exists but belongs to someone else; a nonexistent-id case is a distinct input condition not covered by that bullet. | §5 second bullet only mentions "another user's order id," not a nonexistent one |

## 5. Self-Check

- [x] Every atomic requirement is traceable to the source Functional Requirement (each REQ row cites the exact section/quote).
- [x] No invented business rules or assumptions presented as fact - nothing beyond the FR's text is stated as a REQ; all gaps are in Open Questions (OQ-01..OQ-12), and Section 3 (Assumptions) explicitly contains none.
- [ ] Every equivalence class has at least one covering test case - N/A for Phase 1 (equivalence classes and test cases are produced in Phase 2/3).
- [x] IDs are unique and consistently formatted (`REQ-01`..`REQ-22`, `OQ-01`..`OQ-12`, `AREA-01`..`AREA-09`), zero-padded, no unexplained gaps. (Renumbered after the 2026-07-06 revision: REQ-01 split into REQ-01/REQ-02, former REQ-15 split into REQ-16/REQ-17, and REQ-22 added - all downstream REQ IDs and all REQ cross-references inside Section 4's Open Questions were updated accordingly.)
- [x] No table cell is empty without an explicit marker - all cells populated (Assumptions section explicitly states "None identified" rather than being left blank).
- [x] Terminology is consistent throughout (consistently uses "endpoint" for the two API routes, "order" for the resource, "status" for the enum field, "requirement" for REQ rows).
- [x] Each REQ states one independently-testable rule - REQ-01/REQ-02 (auth per endpoint) and REQ-16/REQ-17 (no-token vs. invalid-token) were split during this revision so a bug affecting only one endpoint/condition remains distinguishable at the requirement level.

## 6. Awaiting User Review

This is the Phase 1 artifact (Requirements Breakdown) for FR-11: Order History
View. Please review the atomic requirements, feature area grouping, and open
questions above. Reply "approved" (or similar) to proceed to Phase 2
(Equivalence Partitioning), or request specific revisions.
