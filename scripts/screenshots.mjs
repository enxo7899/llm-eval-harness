// Reproducible README screenshots. Run `npm run dev` in another terminal, then `npm run screenshots`.
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
const base = process.env.BASE || "http://127.0.0.1:5185/";
const out = process.env.OUT || "docs";
const browser = await chromium.launch();
const errors = [];
async function shot(name, url, { device, viewport = { width: 1360, height: 1200 }, full = false, clip, before } = {}) {
  const ctx = await browser.newContext(device ? { ...devices[device] } : { viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && !/fonts\.(googleapis|gstatic)/.test(m.location().url) && errors.push(`${name}: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.waitForSelector("#metrics tbody");
  await page.waitForTimeout(400);
  if (before) await before(page);
  const h = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (h > 0) errors.push(`${name}: horizontal scroll of ${h}px`);
  await (clip ? page.locator(clip) : page).screenshot({ path: `${out}/${name}.png`, fullPage: full && !clip });
  await ctx.close();
}
await shot("overview", "?run=block", { viewport: { width: 1360, height: 1500 } });
await shot("slices", "?run=block", { clip: "#s3" });
await shot("try-to-break", "?run=small", { viewport: { width: 1100, height: 900 }, clip: "#top" });
await shot("judge-lenient", "?run=lenient", { clip: "#s6" });
await shot("case-inspector", "?run=block&case=al-048", { clip: "#s8" });
await shot("mobile", "?run=block", { device: "iPhone 13", before: (p) => p.evaluate(() => document.getElementById("verdict").scrollIntoView()) });
await browser.close();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("no console errors");
