# FR-06: Product Detail View - Mobile App

> Pool: FR-06 is normally Pool A (Products). Here it is tested via the Expo mobile app.
> Confirm with your group/TA how this counts (extra feature vs a pool slot).
> Source of truth for the SPEC (sections 1-5, 7): EShop System Requirements
> Specification (README.md, Section 3, FR-06), cross-checked against
> api_specification.md.
> Source of truth for section 6 and section 8: actual code, read directly from
> `frontend-mobile/App.js` in the SUT repo (function names/line references given
> so you can re-verify). **Section 8 is NOT the spec** - it is what the app
> currently does. Where it conflicts with sections 1-5, that conflict IS the
> finding; do not silently "fix" the spec to match the code.


## 1. Overview

When a user opens a single product, the mobile app displays the full product detail,
lets the user choose a quantity, and provides an "Add to Cart" action with visual
feedback.

## 2. API Reference (per api_specification.md - this is the documented contract)

- **Product detail:** `GET /api/products/:id` - path param `id`.
- **Success (200 OK):** product object `{ id, name, price, description, imageUrl,
  category_id }`.
- **Add to Cart:** `POST /api/cart` with body `{ id, name, price, quantity }`,
  requires `Authorization: Bearer <token>` (api_specification.md section 4.2).
- **Base URL:** `http://localhost:3000`

> ⚠ See Section 8.3 - the mobile app's actual Add-to-Cart action does not call
> this endpoint at all. Treat this section as "what the contract says should
> exist," not "what the mobile client does."

## 3. Functional Requirements (normative - MUST statements)

### 3.1 Detail display
The product detail screen MUST display all of: large product **image**, **name**,
**price**, **description**, **category**.

### 3.2 Quantity input
- There MUST be a **Quantity** input field.
- Quantity MUST accept only **positive integers**.
- The **minimum** accepted quantity is **1**.

### 3.3 Add to Cart
- There MUST be an **Add to Cart** button.
- After tapping Add to Cart, the app MUST show visual feedback (toast notification or
  an updated cart badge).

## 4. Inputs Summary (for test design)

| Field | Type | Constraint |
| --- | --- | --- |
| Product id (path param) | integer | Must refer to an existing product |
| Quantity | integer | Positive integer; minimum 1 (no explicit maximum stated) |

## 5. Expected Outputs (per spec - what SHOULD happen)

- **Valid product id:** full detail rendered (image, name, price, description, category).
- **Add to cart with valid quantity:** item added; visual feedback shown.
- **Invalid quantity (0, negative, non-integer, empty):** rejected / add prevented
  (spec doesn't say exactly how - see Section 8.2 for what the code actually does,
  which is a candidate finding, not a resolution of this open question).
- **Non-existent product id:** behavior not fully specified - Open Question
  (see Section 8.4 for observed behavior).

## 6. Mobile-Specific Test Dimensions (what makes this a mobile feature, not a web re-run)

The quantity boundary rules are shared with the backend, so the mobile-distinct value is:

- **Numeric keyboard behavior:** does the quantity field bring up a number pad? Can the
  user still paste letters, a decimal point, a minus sign, or leading zeros?
- **Stepper vs free text:** if quantity uses +/- steppers, can it go below 1? What
  happens at 1 when tapping "-"? Is there an upper cap on the stepper?
- **Empty quantity field** on mobile (cleared input) - default to 1, block, or error?
- **Feedback UX:** toast vs badge - does the badge count increment correctly, and by the
  chosen quantity (not always +1)?
- **Double-tap Add to Cart:** does tapping twice quickly add the item twice?
- **Large image loading:** slow network, broken imageUrl - placeholder or crash?
- **Long product name / description:** truncation, overflow, layout break on a narrow
  screen.
- **Back navigation / rotation** while on the detail screen.

## 7. Not Specified in the FR (record as Open Questions in Phase 1 - do NOT assume)

- **Maximum quantity** - none stated. Is it capped by stock, a hard cap, or unbounded?
  (Affects whether an upper BVA boundary exists at all.)
- **Non-integer / decimal quantity** (e.g. 1.5) - rejected how? (Code shows one
  possible answer in 8.2 - confirm whether that's intended behavior or a bug.)
- **Quantity vs available stock** - is stock checked at add-to-cart, or only at
  checkout? FR-06 doesn't say.
- **Non-existent / invalid product id** - 404? error screen? empty page?
- **Add to Cart without login** - allowed (guest cart) or requires auth? api_spec section 4
  implies cart needs a token; FR-06 doesn't say. (Code shows the mobile add-to-cart
  path never even reaches that check - see 8.3.)
- **Price/currency format** on the detail screen.
- **Quantity precision** - integer, so BVA step = 1 (state this explicitly in Phase 4).
- **Test data:** use seeded products from the product list (`GET /api/products`); note a
  valid product id and a plausibly non-existent one (e.g. 999999) for the invalid case.

## 8. Verified Code Facts (from `frontend-mobile/App.js` - read, not guessed)

These are ground-truth observations from the current source, offered so you can
design sharper test cases and anticipate where actual will diverge from expected.
**They are not requirements.** Record them as Phase 1 Observations, and treat any
place they contradict Sections 3-5 as a candidate finding to confirm by running
the app, not as a settled answer.

### 8.1 Category is never rendered
`renderProductDetail()` renders `Image`, `product.name`, `formatMoney(product.price)`,
and `product.description` - there is no line rendering `category` or `category_id`
anywhere in the product detail screen. This directly conflicts with the MUST in
Section 3.1.

### 8.2 Invalid quantity is silently coerced to 1, not rejected
```js
const normalizeQuantity = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};
```
This runs inside `addToCart`, called on button press with the raw string from the
`TextInput`. So typing `0`, `-5`, `abc`, `1.5`, or leaving the field empty does not
block the Add to Cart action and does not show an error - it silently adds
**quantity = 1**. This resolves the "how is invalid quantity handled" open question
at the code level, but the resolution itself (silent coercion vs. spec's implied
"MUST accept only positive integers," which reads more like a rejection rule) is
worth flagging as a candidate finding.

### 8.3 Add to Cart never calls the backend on mobile
`addToCart()` only updates local React state (`setCart(...)`); there is no
`fetch`/`axios` call to `POST /api/cart` anywhere in `frontend-mobile/App.js`.
The cart is entirely client-side in memory until checkout. This means:
- The `Authorization: Bearer <token>` requirement on `POST /api/cart`
  (enforced server-side via `authenticateToken`, confirmed in `server.js`) is
  never exercised by the mobile Add-to-Cart flow at all.
- The "guest cart allowed?" open question is moot for this specific action on
  mobile - worth recording as an Observation, and as a possible spec/implementation
  gap since api_specification.md's cart endpoint assumes auth is checked at
  add-to-cart time.

### 8.4 Non-existent product id shows a graceful message, not a crash
```jsx
if (Object.keys(product).length === 0) {
  return renderScreen(<Text>Sản phẩm không tồn tại (Lỗi trắng trang do data rỗng)</Text>);
}
```
A failed/empty product fetch renders this message rather than crashing. The
message text itself (a dev note referencing a past "blank page from empty data"
bug) is worth screenshotting as-is for your report.

### 8.5 Feedback is an Alert dialog + temporary button text, not a toast or badge count
Add to Cart triggers `Alert.alert("Thành công", "Đã thêm vào giỏ hàng")` and flips
the button label to "Đã thêm" for 2 seconds. Separately, the nav bar shows
`Giỏ (${cart.length})` - this counts **distinct cart line items**, not total
quantity across items. Adding quantity 5 of a new product moves the badge by
exactly 1, not 5. This directly answers (and complicates) the Section 6 question
"does the badge increment by the chosen quantity" - worth verifying by hand.

### 8.6 No double-tap protection
A `clickCount` state variable exists and is reset on entry/add, but it is never
incremented or checked before adding to cart - there is no debounce or disabled
state on the button. Rapid double-tapping is expected to add the item twice.

### 8.7 Quantity field is free-text with a numeric keyboard hint
```jsx
<TextInput style={styles.quantityInput} keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
```
It is a plain `TextInput`, not a stepper - confirms the Section 6 "stepper vs free
text" branch is free-text. `keyboardType="numeric"` is a UI hint only; it does not
prevent paste, and platform numeric keypads vary (Android's may include a decimal
point; iOS's typically doesn't include a minus sign). Worth testing both platforms
if available.