import http from 'k6/http';
import { SharedArray } from 'k6/data';

// --- Environment / target ---------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Seed test account (see sut/backend/database.js). Override via env if needed.
const TEST_EMAIL = __ENV.TEST_EMAIL || 'test@eshop.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'Test1234!';

// --- SLO thresholds ---------------------------------------------------------
const SLO_THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
};

// --- Workload model ---------------------------------------------------------
// Realistic e-commerce mix: browse-heavy, few checkouts. Tune from real logs.
const WORKLOAD_MIX = [
  { action: 'browse', weight: 0.4 },
  { action: 'search', weight: 0.35 },
  { action: 'cart', weight: 0.2 },
  { action: 'checkout', weight: 0.05 },
];

// Search terms that actually match the seeded product names (Vietnamese).
// Using 'headphones'/'keyboard'/'laptop' returns an EMPTY list (still HTTP 200),
// so the test would look green while asserting nothing — avoid that.
const SEARCH_KEYWORDS = new SharedArray('search_keywords', () => [
  'iPhone',
  'Samsung',
  'MacBook',
  'AirPods',
  'Keychron',
]);

// Real product ids seeded 1..5.
const PRODUCT_IDS = new SharedArray('product_ids', () => [1, 2, 3, 4, 5]);

function pickAction() {
  const randomValue = Math.random();
  let cumulative = 0;
  for (const item of WORKLOAD_MIX) {
    cumulative += item.weight;
    if (randomValue <= cumulative) return item.action;
  }
  return WORKLOAD_MIX[WORKLOAD_MIX.length - 1].action;
}

function randomKeyword() {
  return SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
}

function randomProductId() {
  return PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];
}

function randomThinkTimeSeconds() {
  return 1 + Math.random() * 2;
}

// --- Auth helpers -----------------------------------------------------------
// /api/cart and /api/checkout require `Authorization: Bearer <token>`.
// Call login() once in setup() and share the token with the VUs.
function login() {
  const res = http.post(
    `${BASE_URL}/api/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const token = res.json('token');
  if (!token) {
    throw new Error(
      `login() failed: status=${res.status} body=${res.body}. ` +
        `Is the backend up and is LOADTEST=1 set to bypass the rate limiter?`
    );
  }
  return token;
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export {
  BASE_URL,
  TEST_EMAIL,
  TEST_PASSWORD,
  SLO_THRESHOLDS,
  WORKLOAD_MIX,
  SEARCH_KEYWORDS,
  PRODUCT_IDS,
  pickAction,
  randomKeyword,
  randomProductId,
  randomThinkTimeSeconds,
  login,
  authHeaders,
};
