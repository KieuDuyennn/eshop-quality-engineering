# FR-06: Product Detail View (Mobile) - Requirements Breakdown (Phase 1)

Source: `input/Functional_Requirement.md` (FR-06: Product Detail View - Mobile
App). Per the input's own header note, two different things are being read
here, from two different sources of truth:

- **Sections 1-5 and 7 (the spec):** EShop System Requirements Specification
  (README.md §3, FR-06), cross-checked against `api_specification.md`.
- **Sections 6 and 8 (the code):** read directly from
  `frontend-mobile/App.js` in the SUT repo. These are **not** requirements.

## 0. How Sections 6 and 8 Are Handled Here (Scope Note)

- **Section 6** ("Mobile-Specific Test Dimensions") is test-design guidance -
  questions to shape Phase 2/3/4 test thinking. It is **not** turned into
  `MUST`-style atomic requirements. It is listed separately in Section 3 below
  as Test Design Dimensions (TD-xx), not in the Atomic Requirements table.
- **Section 8** ("Verified Code Facts") is ground truth read from the mobile
  client's source code, offered by the user as verified fact for this session
  - **not** the spec. Every item in it is recorded as a Phase 1 **Observation**,
  explicitly tagged `source: code, not spec`. Where a code fact conflicts with
  a `MUST` statement in Section 3 of the input (category never rendered vs.
  §3.1; invalid quantity silently coerced vs. §3.2), that conflict is recorded
  as a **candidate finding** (Section 4 below) - it is not treated as
  resolving the corresponding Open Question, and no verdict on whether it is
  a bug is stated here (that judgment belongs to the user, per project rules).
- Where a code fact makes an Open Question moot for one specific mobile
  action (§8.3: mobile Add-to-Cart never calls `POST /api/cart`, so the
  guest-cart question doesn't arise *for that action*), the original Open
  Question is still kept in Section 5 in full, with a note added explaining
  why it doesn't apply to that specific flow - it is not deleted or marked
  answered.

## 1. Feature Areas

| Area ID | Name | Description |
| --- | --- | --- |
| AREA-01 | API Contract | Documented endpoints/base URL for product detail and Add to Cart (§2) |
| AREA-02 | Detail Display | What the product detail screen MUST display (§3.1) |
| AREA-03 | Quantity Input | Quantity field existence and input constraints (§3.2) |
| AREA-04 | Add to Cart & Feedback | Add to Cart button and required visual feedback (§3.3) |
| AREA-05 | Test Setup Data | Seed data / valid vs. non-existent product id guidance (§7 last bullet) |
| AREA-06 | Verified Code Facts (mobile) | Observations read directly from `frontend-mobile/App.js`, tagged `source: code, not spec` (§8) |

Section 6 ("Mobile-Specific Test Dimensions") is deliberately **not** given
an AREA-xx / REQ-xx slot - see Section 3.

## 2. Atomic Requirements

Classification uses three values, not two. Most rows are "Functional
Requirement" (a system behavior the app MUST perform) or "Observation"
(a documented fact, either from the spec's reference material or, for
REQ-16-REQ-22, from reading source code - see AREA-06). REQ-15 uses a
third, distinct value, "Test Data Constraint": it describes a
precondition for *which test data to select* (an existing product id),
not a behavior the running app performs or enforces, so it is
deliberately not folded into either of the other two buckets.

| REQ ID | Area | Statement | Source Reference | Classification |
| --- | --- | --- | --- | --- |
| REQ-01 | AREA-01 | Product detail is retrieved via `GET /api/products/:id` (path param `id`). | §2 "Product detail: `GET /api/products/:id` - path param `id`." | Observation |
| REQ-02 | AREA-01 | A successful (200 OK) product detail response returns the object `{ id, name, price, description, imageUrl, category_id }`. | §2 "Success (200 OK): product object `{ id, name, price, description, imageUrl, category_id }`." | Observation |
| REQ-03 | AREA-01 | The documented Add to Cart contract is `POST /api/cart` with body `{ id, name, price, quantity }`, requiring header `Authorization: Bearer <token>` (api_specification.md §4.2). | §2 "Add to Cart: `POST /api/cart` with body `{ id, name, price, quantity }`, requires `Authorization: Bearer <token>`..." | Observation |
| REQ-04 | AREA-01 | The base URL for these endpoints is `http://localhost:3000`. | §2 "Base URL: `http://localhost:3000`" | Observation |
| REQ-05 | AREA-02 | The product detail screen MUST display the large product **image**. | §3.1 "MUST display all of: large product **image**..." | Functional Requirement |
| REQ-06 | AREA-02 | The product detail screen MUST display the product **name**. | §3.1 "...**name**..." | Functional Requirement |
| REQ-07 | AREA-02 | The product detail screen MUST display the product **price**. | §3.1 "...**price**..." | Functional Requirement |
| REQ-08 | AREA-02 | The product detail screen MUST display the product **description**. | §3.1 "...**description**..." | Functional Requirement |
| REQ-09 | AREA-02 | The product detail screen MUST display the product **category**. | §3.1 "...**category**." | Functional Requirement |
| REQ-10 | AREA-03 | There MUST be a **Quantity** input field on the product detail screen. | §3.2 "There MUST be a **Quantity** input field." | Functional Requirement |
| REQ-11 | AREA-03 | Quantity MUST accept only **positive integers**. | §3.2 "Quantity MUST accept only **positive integers**." | Functional Requirement |
| REQ-12 | AREA-03 | The minimum accepted quantity is **1**. | §3.2 "The **minimum** accepted quantity is **1**." | Functional Requirement |
| REQ-13 | AREA-04 | There MUST be an **Add to Cart** button. | §3.3 "There MUST be an **Add to Cart** button." | Functional Requirement |
| REQ-14 | AREA-04 | After tapping Add to Cart, the app MUST show visual feedback (toast notification or an updated cart badge). | §3.3 "...the app MUST show visual feedback (toast notification or an updated cart badge)." | Functional Requirement |
| REQ-15 | AREA-05 | For the primary/valid-case scenario, the product id path parameter MUST refer to an existing product. | §4 Inputs Summary, "Product id (path param)" row: "Must refer to an existing product." | Test Data Constraint |
| REQ-16 | AREA-06 | **Candidate finding (source: code, not spec).** `renderProductDetail()` renders `Image`, `product.name`, `formatMoney(product.price)`, and `product.description` - no line renders `category` or `category_id` anywhere on the product detail screen. This directly conflicts with REQ-09. Not resolved here - see CF-01. | §8.1 | Observation |
| REQ-17 | AREA-06 | **Candidate finding (source: code, not spec).** `normalizeQuantity()` (`parseInt(value, 10)`, defaulting to `1` unless the parsed result is a positive finite number) runs inside `addToCart` on the raw `TextInput` string. Typing `0`, `-5`, `abc`, `1.5`, or leaving the field empty does not block Add to Cart and shows no error - it silently adds quantity = 1. This conflicts with REQ-11 read as a rejection rule. Not resolved here - see CF-02. | §8.2 | Observation |
| REQ-18 | AREA-06 | **Source: code, not spec.** `addToCart()` only updates local React state (`setCart(...)`); there is no `fetch`/`axios` call to `POST /api/cart` anywhere in `frontend-mobile/App.js`. The cart is client-side/in-memory until checkout. The `Authorization: Bearer <token>` requirement in REQ-03 is never exercised by this flow. | §8.3 | Observation |
| REQ-19 | AREA-06 | **Source: code, not spec.** When the fetched product is an empty object (`Object.keys(product).length === 0`), the screen renders the message "Sản phẩm không tồn tại (Lỗi trắng trang do data rỗng)" instead of crashing. | §8.4 | Observation |
| REQ-20 | AREA-06 | **Source: code, not spec.** Add to Cart triggers a blocking native `Alert.alert("Thành công", "Đã thêm vào giỏ hàng")` dialog and flips the button label to "Đã thêm" for 2 seconds - this is neither an auto-dismissing toast nor a plain badge update. Separately, the nav bar's `Giỏ (${cart.length})` counts **distinct cart line items**, not total quantity: adding quantity 5 of a new product moves the badge by exactly 1, not 5. | §8.5 | Observation |
| REQ-21 | AREA-06 | **Source: code, not spec.** A `clickCount` state variable exists and is reset on entry/add but is never incremented or checked before the add action runs - there is no debounce or disabled state on the Add to Cart button. Rapid double-tapping is expected to add the item twice. | §8.6 | Observation |
| REQ-22 | AREA-06 | **Source: code, not spec.** The Quantity field is a plain `TextInput` with `keyboardType="numeric"` - not a stepper. This is a UI hint only: it does not block paste, and platform numeric keypads vary (Android's may include a decimal point; iOS's typically omits a minus sign). | §8.7 | Observation |

## 3. Mobile-Specific Test Design Dimensions (Section 6 - Guidance, Not Requirements)

These are **not** atomic requirements and carry no REQ ID or MUST-language -
per the input's own framing, §6 lists dimensions that make this feature
mobile-distinct, to inform later test design. Where a §8 code fact already
bears on a dimension, that is noted, but the dimension itself remains an
open test-design question, not something Phase 1 settles.

| TD ID | Dimension (from §6) | Related Code Fact (if any) | Status |
| --- | --- | --- | --- |
| TD-01 | Numeric keyboard behavior - number pad? can user paste letters/decimal/minus/leading zeros? | REQ-22: free-text field, `keyboardType="numeric"` hint only, does not block paste | Partly informed by code; platform behavior still needs hands-on confirmation on both iOS and Android |
| TD-02 | Stepper vs free text; can it go below 1; behavior at 1; upper cap on stepper | REQ-22: confirmed free-text, no stepper exists | "Stepper" branch of this dimension does not apply on mobile; upper-cap question folds into OQ-01 (max quantity), still open |
| TD-03 | Empty quantity field - default to 1, block, or error? | REQ-17: empty string is silently coerced to quantity = 1, no block/error shown | Candidate finding (CF-02); not confirmed as intended behavior |
| TD-04 | Feedback UX: toast vs badge; does badge increment by chosen quantity? | REQ-20: feedback is an Alert dialog + temporary label, not a toast; badge counts distinct line items, not quantity | Code-observed, but should be confirmed by hand per §8.5's own note |
| TD-05 | Double-tap Add to Cart - added twice? | REQ-21: no debounce/disable guard exists | Code suggests yes; not yet confirmed by running the app |
| TD-06 | Large image loading: slow network, broken imageUrl - placeholder or crash? | None - not covered by §8 | Fully open; no code observation given |
| TD-07 | Long product name/description: truncation, overflow, layout break on narrow screen | None - not covered by §8 | Fully open; no code observation given |
| TD-08 | Back navigation / rotation while on the detail screen | None - not covered by §8 | Fully open; no code observation given |

## 4. Candidate Findings - Spec vs. Observed Code (Unconfirmed, Not Adjudicated Here)

Per project integrity rules, these are recorded as conflicts only. No verdict
("bug" or "not a bug") is stated - that determination is the user's to make
after hands-on verification.

| ID | Conflict | Spec Side | Code Side |
| --- | --- | --- | --- |
| CF-01 | Category display | REQ-09 (§3.1): detail screen MUST display category | REQ-16 (§8.1): category appears to be never rendered anywhere on the mobile detail screen (source: static code read; not yet confirmed by running the app) |
| CF-02 | Invalid quantity handling | REQ-11 (§3.2): quantity MUST accept only positive integers (read as an implied rejection rule for anything else) | REQ-17 (§8.2): invalid input (`0`, negative, non-integer, empty) appears to never be rejected - code suggests it is silently coerced to quantity = 1 (source: static code read; not yet confirmed by running the app) |

## 5. Assumptions

None identified. Per session rules, ambiguous or unstated behavior is
recorded under Open Questions (Section 6 below) instead of being assumed.

## 6. Open Questions

OQ-01 through OQ-08 are taken directly from §7 of the input ("Not Specified
in the FR"). None are answered or guessed here, including where a §8 code
fact bears on them - a code fact narrows what to test, it does not settle
what the spec *should* require.

| ID | Question | Why It Matters | Evidence |
| --- | --- | --- | --- |
| OQ-01 | Maximum quantity - none stated. Is it capped by stock, a hard cap, or unbounded? | Determines whether Phase 4 BVA has an upper boundary at all. Note: REQ-22/REQ-17's code (`normalizeQuantity`) imposes no upper bound either, but that is only what the current mobile client happens to do - it does not establish what the business rule should be, so this remains open. | §7 bullet 1 |
| OQ-02 | Non-integer / decimal quantity (e.g. `1.5`) - rejected how? | Needed to define the invalid-quantity equivalence class's expected behavior in Phase 2/3. Note: REQ-17/§8.2 shows `parseInt("1.5", 10)` truncates to `1` and is silently accepted, not rejected - this is a candidate finding (CF-02), not a confirmed answer to "how it *should* be rejected." | §7 bullet 2; cross-ref REQ-17, CF-02 |
| OQ-03 | Quantity vs. available stock - is stock checked at add-to-cart, or only at checkout? | Determines whether an "insufficient stock" equivalence class exists for this screen. Section 8 gives no observation on stock-checking (no stock field or stock-check call appears in the cited code facts), so this remains fully open. | §7 bullet 3 |
| OQ-04 | Non-existent / invalid product id - 404? error screen? empty page? | Determines the expected-output equivalence class for the invalid-id case. Note: REQ-19/§8.4 shows the mobile client's own rendering when the fetched product resolves to an empty object (a graceful message, not a crash) - but that describes only the mobile client's reaction, not what a specific HTTP status/response shape is contracted to be, so the underlying question is still open. | §7 bullet 4; cross-ref REQ-19 |
| OQ-05 | Add to Cart without login - allowed (guest cart) or requires auth? `api_specification.md` §4 implies the cart endpoint needs a token; FR-06 doesn't say. | Determines whether an unauthenticated-add test case is meaningful for this screen. Note: REQ-18/§8.3 shows this question is **moot for the mobile Add-to-Cart action specifically**, since that action never calls `POST /api/cart` at all - no auth check is ever reached client-side. The question remains open and is kept in full because it still applies to the documented contract (REQ-03) and to any other flow (e.g. checkout) that does call the backend. | §7 bullet 5; cross-ref REQ-03, REQ-18 |
| OQ-06 | Price/currency format on the detail screen. | Needed to define the valid-output equivalence class for the price field in Phase 2. No §8 code fact addresses number/currency formatting, so this remains fully open. | §7 bullet 6 |
| OQ-07 | Quantity precision - integer, so BVA step = 1 (state this explicitly in Phase 4). | Not a question requiring an answer so much as a design instruction to carry forward; kept here per the input's own framing so it isn't lost before Phase 4. | §7 bullet 7 |
| OQ-08 | Test data: use seeded products from `GET /api/products`; note one valid product id and one plausibly non-existent id (e.g. `999999`) for the invalid case. | Needed to prepare concrete test data before Phase 3/4 design. Kept here per the input's own framing rather than folded into Assumptions. | §7 bullet 8 |

## 7. Self-Check

Re-run after the 2026-07-06 Phase 1 self-critique fixes (P1-G01, P1-G03,
P1-G04 applied; P1-G02 explicitly **not** fixed - see caveat below).

- [x] Every atomic requirement is traceable to the source Functional
      Requirement - each REQ row quotes or directly cites its originating
      §-section; REQ-16-REQ-22 cite the specific §8.x code-fact subsection
      instead, since they are code observations, not spec text.
- [x] Classification scheme is now internally consistent:
      REQ-15 was relabeled from "Functional Requirement" to a new, distinct
      value, "Test Data Constraint" - it is a precondition for test-data
      selection (§4's "for test design" table), not a system behavior, and
      no longer sits in the same bucket as REQ-05-REQ-14's genuine
      system-behavior MUSTs. Section 2's preamble now explains the
      three-way classification scheme (Functional Requirement / Observation
      / Test Data Constraint) so a reader doesn't have to infer it from one
      row.
- [x] CF-01/CF-02 wording now matches the TD table's hedging style (fixes
      P1-G03, P1-G04): both cells state inline "(source: static code read;
      not yet confirmed by running the app)" - the same evidentiary
      caveat the TD table already used (e.g. TD-05: "not yet confirmed by
      running the app") - rather than relying only on Section 4's header
      to carry it by reference.
- [x] No invented business rules or assumptions presented as fact - every
      REQ is either a direct quote/citation (spec) or an explicitly-tagged
      `source: code, not spec` observation; nothing is inferred beyond what
      §1-§5, §7, or §8 state. Section 5 (Assumptions) explicitly contains
      none. Where code conflicts with spec (CF-01, CF-02), the conflict is
      recorded without a verdict.
- [ ] Every equivalence class has at least one covering test case - N/A for
      Phase 1 (equivalence classes and test cases are produced in
      Phase 2/3).
- [x] IDs are unique and consistently formatted: `REQ-01`..`REQ-22`,
      `AREA-01`..`AREA-06`, `TD-01`..`TD-08`, `CF-01`..`CF-02`,
      `OQ-01`..`OQ-08` - all zero-padded, no gaps.
- [x] No table cell is empty without an explicit marker - all cells
      populated; Assumptions section explicitly states "None identified."
- [x] Terminology is consistent throughout: "screen" for the mobile view,
      "field" for inputs, "endpoint" for API routes, "quantity" (not mixed
      with "amount"/"count").
- [x] Section 6 of the input (mobile test dimensions) is kept out of the
      REQ-xx/MUST table and given its own TD-xx table per the task's
      explicit instruction not to turn it into MUST-style FRs.
- [x] Section 8 of the input (verified code facts) is recorded entirely as
      Observations tagged `source: code, not spec` (REQ-16-REQ-22), and does
      not silently overwrite or resolve any Open Question - each conflict
      is separately captured in Section 4 (Candidate Findings) and
      cross-referenced from Section 6 (Open Questions) without being marked
      answered.
- [x] Where §8 makes an Open Question moot for one specific action (OQ-05
      vs. the mobile Add-to-Cart flow, per §8.3), the original question is
      kept in full with an added note explaining the scope of the
      mootness - it is not deleted or marked resolved.

**Known open item, not fixed in this pass (P1-G02):** no hands-on/device
observation exists anywhere in this artifact. CF-01 and CF-02 remain based
solely on a static read of `frontend-mobile/App.js`; the user has
confirmed no device data is available yet, rather than supplying it, so
this was deliberately left unfixed here - not silently dropped. Device
verification is deferred to before Phase 5 (there is no Phase 5 in this
skill's 4-phase workflow, so in practice this means: before this artifact
is treated as fully confirmed, and revisited if execution in a later phase
depends on CF-01/CF-02 being settled one way or the other).

## 8. Awaiting User Review

This is the Phase 1 artifact (Requirements Breakdown) for FR-06: Product
Detail View (Mobile). Please review the atomic requirements, the Section 6
test-design dimensions (TD-xx), the candidate findings (CF-01, CF-02), and
the open questions above. Reply "approved" (or similar) to proceed to
Phase 2 (Equivalence Partitioning), or request specific revisions.
