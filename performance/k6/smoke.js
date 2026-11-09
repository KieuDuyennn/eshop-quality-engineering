// Smoke test: a short, light run that fails the job when an SLO is broken.
// 5 VUs for 30 s against the public read endpoints. The thresholds make k6 exit
// non-zero (exit code 99) when p95 latency or the error rate is over target.
// Run with the backend started using LOADTEST=1.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, randomKeyword } from './lib/config.js';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

function isNonEmptyArray(res) {
  try {
    const body = res.json();
    return Array.isArray(body) && body.length > 0;
  } catch (e) {
    return false;
  }
}

export default function () {
  const list = http.get(`${BASE_URL}/api/products`, { tags: { name: 'GET /api/products' } });
  check(list, {
    'GET /api/products - status is 200': (r) => r.status === 200,
    'GET /api/products - body is a non-empty array': isNonEmptyArray,
  });

  // The keywords match seeded product names, so an empty result means a real problem.
  const search = http.get(`${BASE_URL}/api/products?search=${encodeURIComponent(randomKeyword())}`, {
    tags: { name: 'GET /api/products?search' },
  });
  check(search, {
    'GET /api/products?search - status is 200': (r) => r.status === 200,
    'GET /api/products?search - body is a non-empty array': isNonEmptyArray,
  });

  sleep(1);
}
