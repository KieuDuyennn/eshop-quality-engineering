// ============================================================================
// k6_baseline.js
// Baseline Test - EShop API (Khuc 04)
// Muc tieu: 50 VUs dong thoi, workload model 60/30/10
//   - 60% GET  /api/products  (duyet danh sach san pham)
//   - 30% POST /api/cart      (them san pham vao gio hang)
//   - 10% POST /api/checkout  (thanh toan don hang)
// ============================================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import papaparse from "https://jslib.k6.io/papaparse/5.1.1/index.js";

// ----------------------------------------------------------------------------
// Cau hinh chung
// ----------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Token Pool: nap danh sach tai khoan/token tu file CSV.
// Moi VU se duoc cap phat 1 dong (session) doc lap dua tren __VU,
// tranh xung dot khoa co so du lieu khi nhieu VU cung ghi gio hang.
const users = new SharedArray("users", function () {
  const csvData = open("../data/users.csv");
  return papaparse.parse(csvData, { header: true }).data;
});

// ----------------------------------------------------------------------------
// Options: Load Profile + Thresholds
// ----------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: "30s", target: 50 }, // Ramp-up: 0 -> 50 VUs trong 30s
    { duration: "300s", target: 50 }, // Hold: giu nguyen 50 VUs trong 300s (5 phut)
    { duration: "30s", target: 0 }, // Ramp-down: 50 -> 0 VUs trong 30s
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // p95 Latency phai nho hon 500ms
    http_req_failed: ["rate<0.01"], // Error Rate phai nho hon 1%
  },
};

// ----------------------------------------------------------------------------
// Ham chinh - moi VU se lap lai ham nay trong suot vong doi cua no
// ----------------------------------------------------------------------------
export default function () {
  // Cap phat 1 tai khoan/token doc lap cho VU hien tai theo Token Pool tu CSV
  const user = users[(__VU - 1) % users.length];
  const authHeaders = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.token}`,
    },
  };

  // ---- Phan bo ty le hanh vi 60/30/10 bang Weighted Random Distribution ----
  // Sinh 1 so ngau nhien trong [0, 1):
  //   [0.00, 0.60) -> 60% duyet san pham
  //   [0.60, 0.90) -> 30% them vao gio hang
  //   [0.90, 1.00) -> 10% thanh toan
  const rand = Math.random();

  if (rand < 0.6) {
    browseProducts(authHeaders);
  } else if (rand < 0.9) {
    addToCart(authHeaders, user);
  } else {
    checkout(authHeaders, user);
  }

  // Think-time: gia lap thoi gian nguoi dung doc luot man hinh (~1 giay)
  sleep(1);
}

// ----------------------------------------------------------------------------
// Kich ban 1 (60%): Duyet danh sach san pham
// ----------------------------------------------------------------------------
function browseProducts(authHeaders) {
  const res = http.get(`${BASE_URL}/api/products`, authHeaders);

  // Chong bay "HTTP 200 OK gia": khong chi kiem tra status code,
  // ma phai quet sau vao Response Body de xac nhan du lieu hop le.
  check(res, {
    "GET /api/products - status is 200": (r) => r.status === 200,
    "GET /api/products - body la mot mang": (r) => {
      try {
        return Array.isArray(r.json());
      } catch (e) {
        return false;
      }
    },
    "GET /api/products - co du thuoc tinh id & price": (r) => {
      try {
        const body = r.json();
        if (!Array.isArray(body) || body.length === 0) return false;
        return body.every(
          (item) =>
            Object.prototype.hasOwnProperty.call(item, "id") &&
            Object.prototype.hasOwnProperty.call(item, "price"),
        );
      } catch (e) {
        return false;
      }
    },
  });
}

// ----------------------------------------------------------------------------
// Kich ban 2 (30%): Them san pham vao gio hang
// ----------------------------------------------------------------------------
function addToCart(authHeaders, user) {
  const payload = JSON.stringify({
    productId: user.productId || "P001",
    quantity: 1,
    sessionId: user.token, // dam bao moi VU thao tac tren gio hang rieng cua minh
  });

  const res = http.post(`${BASE_URL}/api/cart`, payload, authHeaders);

  check(res, {
    "POST /api/cart - status is 200/201": (r) =>
      r.status === 200 || r.status === 201,
    "POST /api/cart - body co cartId": (r) => {
      try {
        const body = r.json();
        return (
          Object.prototype.hasOwnProperty.call(body, "cartId") ||
          Object.prototype.hasOwnProperty.call(body, "id")
        );
      } catch (e) {
        return false;
      }
    },
  });
}

// ----------------------------------------------------------------------------
// Kich ban 3 (10%): Tien hanh thanh toan don hang
// ----------------------------------------------------------------------------
function checkout(authHeaders, user) {
  const payload = JSON.stringify({
    sessionId: user.token,
    paymentMethod: "CREDIT_CARD",
  });

  const res = http.post(`${BASE_URL}/api/checkout`, payload, authHeaders);

  check(res, {
    "POST /api/checkout - status is 200/201": (r) =>
      r.status === 200 || r.status === 201,
    "POST /api/checkout - body co orderId": (r) => {
      try {
        const body = r.json();
        return Object.prototype.hasOwnProperty.call(body, "orderId");
      } catch (e) {
        return false;
      }
    },
  });
}
