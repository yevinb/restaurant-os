/**
 * Production smoke test — run: BASE_URL=https://restaurant-os-03o4.onrender.com node scripts/test-production.mjs
 */
const BASE = process.env.BASE_URL || "https://restaurant-os-03o4.onrender.com";
const results = [];

function pass(name, detail = "") {
  results.push({ name, status: "PASS", detail });
}
function fail(name, detail = "") {
  results.push({ name, status: "FAIL", detail });
}

async function login() {
  const jar = {};
  const save = (res) => {
    for (const c of res.headers.getSetCookie?.() || []) {
      const i = c.indexOf("=");
      jar[c.slice(0, i)] = c.slice(i + 1).split(";")[0];
    }
  };
  const cookie = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  save(csrfRes);
  if (!csrfRes.ok) throw new Error(`CSRF ${csrfRes.status}`);
  const { csrfToken } = await csrfRes.json();

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie() },
    body: new URLSearchParams({
      csrfToken,
      email: "owner@demo.restaurant",
      password: "demo1234",
      redirect: "false",
      json: "true",
    }),
  });
  save(loginRes);
  if (!jar["__Secure-next-auth.session-token"] && !jar["next-auth.session-token"]) {
    const body = await loginRes.json().catch(() => ({}));
    throw new Error("Login failed: " + JSON.stringify(body));
  }
  return cookie();
}

console.log(`Testing ${BASE}...\n`);

// Public pages
for (const p of ["/", "/login", "/register", "/pricing", "/terms", "/privacy"]) {
  try {
    const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
    (r.ok || r.status === 307 ? pass : fail)(`Public ${p}`, `HTTP ${r.status}`);
  } catch (e) {
    fail(`Public ${p}`, e.message);
  }
}

// Public booking page (demo slug from seed)
try {
  const r = await fetch(`${BASE}/book/demo-restaurant`);
  (r.ok ? pass : fail)("Public booking page", `HTTP ${r.status}`);
} catch (e) {
  fail("Public booking page", e.message);
}

let cookie;
try {
  cookie = await login();
  pass("Demo login");
} catch (e) {
  fail("Demo login", e.message);
  console.log("\n=== Production Test Results ===\n");
  results.forEach((r) => console.log(`${r.status === "PASS" ? "✅" : "❌"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`));
  process.exit(1);
}

const h = { Cookie: cookie, "Content-Type": "application/json" };

for (const p of [
  "/dashboard",
  "/dashboard/reservations",
  "/dashboard/crm",
  "/dashboard/settings",
]) {
  const r = await fetch(`${BASE}${p}`, { headers: { Cookie: cookie }, redirect: "manual" });
  (r.ok || r.status === 307 ? pass : fail)(`Page ${p}`, `HTTP ${r.status}`);
}

for (const p of ["/api/dashboard", "/api/reservations", "/api/customers", "/api/settings"]) {
  const r = await fetch(`${BASE}${p}`, { headers: { Cookie: cookie } });
  if (r.ok) pass(`API ${p}`);
  else fail(`API ${p}`, `HTTP ${r.status}`);
}

// Settings has slug for booking link
const settings = await fetch(`${BASE}/api/settings`, { headers: { Cookie: cookie } }).then((r) => r.json());
if (settings.slug) pass("Settings returns slug", settings.slug);
else fail("Settings returns slug");

// Public booking API
if (settings.slug) {
  const bookGet = await fetch(`${BASE}/api/public/book/${settings.slug}`);
  if (bookGet.ok) pass("Public book API GET", settings.slug);
  else fail("Public book API GET", `HTTP ${bookGet.status}`);
}

// Email config status
const emailTest = await fetch(`${BASE}/api/email/test`, { headers: { Cookie: cookie } }).then((r) => r.json());
if (emailTest.configured) pass("Email configured for customers");
else pass("Email status", emailTest.hint || "Not configured — expected without Brevo");

const passed = results.filter((r) => r.status === "PASS").length;
const failed = results.filter((r) => r.status === "FAIL").length;

console.log("\n=== Production Test Results ===\n");
results.forEach((r) => console.log(`${r.status === "PASS" ? "✅" : "❌"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`));
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
