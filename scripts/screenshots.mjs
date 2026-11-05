// Screenshots for the README (npm run screenshots [base-url]).
// Uses the locally installed Chrome; signs in through the "Explore the demo" buttons.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "https://coverwatch-five.vercel.app";
const OUT = "docs/images";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });

async function signIn(page, role) {
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: new RegExp(role, "i") }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

async function shot(page, path, name, waitFor) {
  await page.goto(BASE + path);
  if (waitFor) await page.getByText(waitFor, { exact: false }).first().waitFor();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800); // charts finish drawing
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("saved", name);
}

// Desktop: manager
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await desktop.newPage();
await signIn(page, "Service manager");
await shot(page, "/dashboard", "dashboard", "Active contracts");
await shot(page, "/renewals", "renewals", "Decision overdue");
const contract = await page.locator('a[href^="/contracts/"]').first().getAttribute("href");
await shot(page, contract, "contract", "Preventive plan");
await page.goto(`${BASE}/customers?q=Datenhaus`);
const customer = await page.locator('a[href^="/customers/"]').first().getAttribute("href");
await shot(page, customer, "customer-360", "Availability (90 days)");
await shot(page, "/service-requests?status=all&period=90d", "service-requests", "SLA");
await desktop.close();

// Phone: technician
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mobile = await phone.newPage();
await signIn(mobile, "Technician");
await shot(mobile, "/my-work", "technician-mobile", "Open service requests");
await phone.close();

await browser.close();
