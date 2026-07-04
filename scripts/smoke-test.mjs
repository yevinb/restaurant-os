import "dotenv/config";

const BASE = process.env.BASE_URL || "http://localhost:8080";

async function waitForServer(max = 30) {
  for (let i = 0; i < max; i++) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function testPages() {
  const pages = [
    "/",
    "/login",
    "/register",
    "/pricing",
    "/forgot-password",
  ];
  const results = [];
  for (const p of pages) {
    const r = await fetch(`${BASE}${p}`);
    results.push({ p, ok: r.ok, status: r.status });
  }
  return results;
}

async function testLoginAndApis() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      email: "owner@demo.restaurant",
      password: "demo1234",
      redirect: "false",
      json: "true",
    }),
    redirect: "manual",
  });

  const cookies = loginRes.headers.getSetCookie?.() || [];
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

  if (!cookieHeader) {
    return { login: false, apis: [] };
  }

  const apis = [
    "/api/dashboard",
    "/api/reservations",
    "/api/customers",
    "/api/loyalty",
    "/api/marketing",
    "/api/analytics",
    "/api/assistant",
    "/api/shifts",
    "/api/settings",
  ];

  const apiResults = [];
  for (const path of apis) {
    const r = await fetch(`${BASE}${path}`, {
      headers: { Cookie: cookieHeader },
    });
    apiResults.push({ path, status: r.status, ok: r.ok });
  }

  return { login: loginRes.status === 200 || loginRes.status === 302, apis: apiResults };
}

const up = await waitForServer();
if (!up) {
  console.log("FAIL: server not running");
  process.exit(1);
}

const pages = await testPages();
const auth = await testLoginAndApis();

console.log(JSON.stringify({ pages, auth }, null, 2));

const pageFails = pages.filter((p) => !p.ok);
const apiFails = auth.apis.filter((a) => !a.ok);

if (pageFails.length || !auth.login || apiFails.length) {
  process.exit(1);
}
