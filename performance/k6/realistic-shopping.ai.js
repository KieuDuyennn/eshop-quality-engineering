import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  SLO_THRESHOLDS,
  randomKeyword,
  randomProductId,
  randomThinkTimeSeconds,
  login,
  authHeaders,
} from './lib/config.js';

/*
AUDIT CHECKLIST (Review every AI-generated revision)
1) Fabricated endpoints: verify all routes exist in the SUT.
   -> The seed log uses `/api/products/search?q=` which does NOT exist here;
      the real search is `GET /api/products?search=`. Corrected below.
2) Missing auth: /api/cart and /api/checkout need `Authorization: Bearer`.
   -> AI drafts often skip the login step. Added setup() login.
3) Unrealistic action ratios: compare mix with observed logs and business context.
4) Missing/incorrect think-time: keep user pacing realistic (1-3s unless justified).
5) Hard-coded IDs: avoid brittle product/user/cart IDs without a data strategy.
6) Weak assertions: assert status === 200, not just `< 500` (401/404/429 pass < 500).
*/

export const options = {
  scenarios: {
    realistic_shopping_ai: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: SLO_THRESHOLDS,
};

export function setup() {
  return { token: login() };
}

export default function (data) {
  const token = data.token;

  const browse = http.get(`${BASE_URL}/api/products`);
  check(browse, { 'browse status is 200': (r) => r.status === 200 });
  sleep(randomThinkTimeSeconds());

  const search = http.get(`${BASE_URL}/api/products?search=${randomKeyword()}`);
  check(search, { 'search status is 200': (r) => r.status === 200 });
  sleep(randomThinkTimeSeconds());

  const addCart = http.post(
    `${BASE_URL}/api/cart`,
    JSON.stringify({ productId: randomProductId(), quantity: 1 }),
    { headers: authHeaders(token) }
  );
  check(addCart, { 'cart status is 200': (r) => r.status === 200 });
  sleep(randomThinkTimeSeconds());

  const checkout = http.post(
    `${BASE_URL}/api/checkout`,
    JSON.stringify({ total_amount: 30000000, shipping_address: '1 Test St' }),
    { headers: authHeaders(token) }
  );
  check(checkout, { 'checkout status is 200': (r) => r.status === 200 });
  sleep(randomThinkTimeSeconds());
}
