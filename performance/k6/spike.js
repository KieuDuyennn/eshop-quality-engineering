import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  SLO_THRESHOLDS,
  pickAction,
  randomKeyword,
  randomProductId,
  randomThinkTimeSeconds,
  login,
  authHeaders,
} from './lib/config.js';

// Spike load: 50 VU -> 500 VU in 30s, hold 2 min, recover (per T05 objectives).
// Run the backend with LOADTEST=1 to bypass the /api rate limiter while measuring.
export const options = {
  scenarios: {
    spike_load: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '30s', target: 500 },
        { duration: '2m', target: 500 },
        { duration: '1m', target: 50 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: SLO_THRESHOLDS,
};

// Authenticate once; share the token with every VU.
export function setup() {
  return { token: login() };
}

function sendAction(action, token) {
  let response;

  switch (action) {
    case 'search':
      response = http.get(`${BASE_URL}/api/products?search=${randomKeyword()}`);
      break;
    case 'cart':
      response = http.post(
        `${BASE_URL}/api/cart`,
        JSON.stringify({ productId: randomProductId(), quantity: 1 }),
        { headers: authHeaders(token) }
      );
      break;
    case 'checkout':
      response = http.post(
        `${BASE_URL}/api/checkout`,
        JSON.stringify({ total_amount: 30000000, shipping_address: '1 Test St' }),
        { headers: authHeaders(token) }
      );
      break;
    case 'browse':
    default:
      response = http.get(`${BASE_URL}/api/products`);
      break;
  }

  check(response, {
    [`${action} status is 200`]: (r) => r.status === 200,
  });
}

export default function (data) {
  const action = pickAction();
  sendAction(action, data.token);
  sleep(randomThinkTimeSeconds());
}
