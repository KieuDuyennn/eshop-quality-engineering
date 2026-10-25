import type { APIRequestContext, APIResponse } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { API_URL } from './env';

/**
 * Thin client for the EShop backend, used for test SETUP and for the API-channel
 * assertions of FR-11.
 *
 * Why a helper rather than inline calls: FR-11 is an "API-setup + UI-assert"
 * feature. Every UI case needs orders that exist in specific statuses, and the
 * only way to create them is through the API. Keeping that here means the spec
 * reads as cases and assertions rather than as HTTP plumbing.
 *
 * Everything below was verified against the running SUT on 2026-08-10, and two
 * facts about it shape the whole file:
 *
 *   1. `POST /api/checkout` writes `total_amount` straight from the request body
 *      with no validation and no server-side recalculation (server.js:313), and
 *      SQLite is dynamically typed - so a deliberately invalid total survives
 *      into the INTEGER column intact. That is what makes TC-31/33/34 reachable,
 *      and it is why `total_amount` here is `unknown`, not `number`: narrowing it
 *      would make the invalid cases unwritable.
 *   2. The status machine allows only pending -> confirmed -> shipping ->
 *      delivered, plus pending/confirmed -> canceled. There is no shortcut, so
 *      seeding a `delivered` order costs three sequential calls. `walkToStatus`
 *      is the only correct way to get there.
 *
 * Note this file makes no assertions. It is setup, so a failure here is an
 * environment problem, not a finding - hence the explicit throws with the
 * response body included, so a broken fixture says why rather than surfacing as
 * a mysterious red assertion later.
 */

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'canceled';

export interface Order {
  id: number;
  user_id: number;
  total_amount: unknown;
  status: string;
  shipping_address: string | null;
  created_at: string;
}

async function detail(response: APIResponse): Promise<string> {
  return `${response.status()} ${await response.text()}`;
}

/** Registers an account. Used for the per-run `other` and `empty` identities. */
export async function register(
  request: APIRequestContext,
  account: { name: string; email: string; password: string },
): Promise<void> {
  const response = await request.post(`${API_URL}/api/register`, { data: account });
  if (!response.ok()) {
    throw new Error(`setup: register ${account.email} failed - ${await detail(response)}`);
  }
}

/** Returns a bearer token. Throws on failure - a fixture must not proceed tokenless. */
export async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const response = await request.post(`${API_URL}/api/login`, { data: { email, password } });
  if (!response.ok()) {
    throw new Error(`setup: login ${email} failed - ${await detail(response)}`);
  }
  const body = await response.json();
  if (!body.token) throw new Error(`setup: login ${email} returned no token`);
  return body.token as string;
}

/**
 * Creates one order and returns its id.
 *
 * `total_amount` is passed through untouched, including values that are not
 * numbers - see note 1 in the file header.
 */
export async function checkout(
  request: APIRequestContext,
  token: string,
  total_amount: unknown = 1_000_000,
): Promise<number> {
  const response = await request.post(`${API_URL}/api/checkout`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      total_amount,
      items: typeof total_amount === 'number' ? [{ price: total_amount, quantity: 1 }] : undefined,
      shipping_address: '227 Nguyen Van Cu, Q5, TP.HCM',
    },
  });
  if (!response.ok()) {
    throw new Error(`setup: checkout failed - ${await detail(response)}`);
  }
  const body = await response.json();
  return body.orderId as number;
}

/** The same call without the throw, for the case that asserts on its status. */
export function checkoutRaw(
  request: APIRequestContext,
  token: string,
  total_amount: unknown,
  items?: CartItem[],
): Promise<APIResponse> {
  return request.post(`${API_URL}/api/checkout`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { total_amount, items, shipping_address: '227 Nguyen Van Cu, Q5, TP.HCM' },
  });
}

export function setStatusRaw(
  request: APIRequestContext,
  token: string | null,
  orderId: number | string,
  status: string,
): Promise<APIResponse> {
  return request.put(`${API_URL}/api/admin/orders/${orderId}/status`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data: { status },
  });
}

export function cancelRaw(
  request: APIRequestContext,
  token: string | null,
  orderId: number | string,
): Promise<APIResponse> {
  return request.put(`${API_URL}/api/orders/${orderId}/cancel`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/** `token` may be null: the no-token cases need the request sent without the header. */
export function orderDetailRaw(
  request: APIRequestContext,
  token: string | null,
  orderId: number | string,
): Promise<APIResponse> {
  return request.get(`${API_URL}/api/orders/${orderId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function adminOrdersListRaw(
  request: APIRequestContext,
  token: string,
): Promise<APIResponse> {
  return request.get(`${API_URL}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** `token` may be null: FR-13's API-01 needs the request sent with no header at all. */
export function adminOrdersListRawMaybe(
  request: APIRequestContext,
  token: string | null,
): Promise<APIResponse> {
  return request.get(`${API_URL}/api/admin/orders`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/** Second endpoint behind the same middleware - FR-13 API-04. */
export function adminUsersListRaw(
  request: APIRequestContext,
  token: string | null,
): Promise<APIResponse> {
  return request.get(`${API_URL}/api/admin/users`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/**
 * The self-update endpoint. `role` is included deliberately: `server.js:137-145`
 * reads it from the request body and writes it, so FR-13 TC-19 sends it to check
 * whether a user can promote themselves. Setup helpers make no assertions - the
 * spec decides what the response means.
 */
export function updateMeRaw(
  request: APIRequestContext,
  token: string,
  data: Record<string, unknown>,
): Promise<APIResponse> {
  return request.put(`${API_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
}

export async function getMe(
  request: APIRequestContext,
  token: string,
): Promise<Record<string, unknown>> {
  const response = await request.get(`${API_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) throw new Error(`setup: /users/me failed - ${await detail(response)}`);
  return (await response.json()) as Record<string, unknown>;
}

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

/**
 * Adds one item to the server-side cart.
 *
 * The cart is an in-memory object keyed by user id (`server.js:32`, `userCarts`),
 * and `POST /api/cart` pushes the request body verbatim - there is no schema and no
 * product lookup. `POST /api/checkout` never reads it. That disconnect is exactly
 * what FR-13 TC-11 exists to measure: README FR-08 requires the total to be
 * recomputed from the cart, so the cart has to be populated for the requirement to
 * be expressible at all.
 */
export async function addToCart(
  request: APIRequestContext,
  token: string,
  item: CartItem,
): Promise<void> {
  const response = await request.post(`${API_URL}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` },
    data: item,
  });
  if (!response.ok()) {
    throw new Error(`setup: add to cart failed - ${await detail(response)}`);
  }
}

/**
 * Mints a correctly signed HS256 token for auth boundary cases the SUT cannot issue
 * through its public login endpoint (expired and nonexistent-user identities).
 * The secret is the SUT's published constant supplied through `SUT_JWT_SECRET`, never
 * written into this tracked file. No JWT dependency is needed for this small setup use.
 */
export function mintToken(
  secret: string,
  payload: Record<string, unknown>,
): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function mintExpiredToken(
  secret: string,
  payload: Record<string, unknown>,
): string {
  // `server.js:69` signs without expiresIn, so an expired token cannot be obtained by
  // waiting for a normal SUT-issued token; the past exp is deliberate test setup.
  return mintToken(secret, {
    ...payload,
    exp: Math.floor(Date.now() / 1000) - 3600,
  });
}

/** Raw form for auth-negative cases; unlike myOrders(), it does not turn denial into setup failure. */
export function myOrdersRaw(
  request: APIRequestContext,
  token: string | null,
): Promise<APIResponse> {
  return request.get(`${API_URL}/api/orders/my-orders`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function myOrders(
  request: APIRequestContext,
  token: string,
): Promise<Order[]> {
  const response = await myOrdersRaw(request, token);
  if (!response.ok()) {
    throw new Error(`setup: my-orders failed - ${await detail(response)}`);
  }
  return (await response.json()) as Order[];
}

/**
 * The only legal route to a non-pending status. Each step is checked, so a
 * transition table change in the SUT surfaces here as a clear setup error rather
 * than as a case that silently asserts against the wrong status.
 *
 * `canceled` is reached through the admin endpoint (pending -> canceled) rather
 * than through the customer cancel endpoint, so that seeding never depends on the
 * cancel guard that TC-26/27 are testing. A fixture must not rely on the thing
 * under test.
 */
export async function walkToStatus(
  request: APIRequestContext,
  adminToken: string,
  orderId: number,
  target: OrderStatus,
): Promise<void> {
  const chains: Record<OrderStatus, OrderStatus[]> = {
    pending: [],
    confirmed: ['confirmed'],
    shipping: ['confirmed', 'shipping'],
    delivered: ['confirmed', 'shipping', 'delivered'],
    canceled: ['canceled'],
  };

  for (const step of chains[target]) {
    const response = await setStatusRaw(request, adminToken, orderId, step);
    if (!response.ok()) {
      throw new Error(
        `setup: order ${orderId} could not be moved to "${step}" on the way to ` +
        `"${target}" - ${await detail(response)}`,
      );
    }
  }
}

/** Creates one order already in the requested status, and returns its id. */
export async function seedOrder(
  request: APIRequestContext,
  ownerToken: string,
  adminToken: string,
  spec: { status: OrderStatus; total_amount?: unknown },
): Promise<number> {
  const orderId = await checkout(
    request,
    ownerToken,
    spec.total_amount === undefined ? 1_000_000 : spec.total_amount,
  );
  await walkToStatus(request, adminToken, orderId, spec.status);
  return orderId;
}
