import fs from "node:fs/promises";

const counterOrigin = "https://lost-fund-case-open-counter.wnblackadder.chatgpt.site";

for (const file of ["assets/app.mjs", "assets/crypto.mjs", "assets/markdown.mjs"]) {
  const source = await fs.readFile(new URL(`../${file}`, import.meta.url), "utf8");
  for (const forbidden of ["innerHTML", "outerHTML", "eval(", "document.write", "http://cdn", "https://cdn"]) {
    if (source.includes(forbidden)) throw new Error(`${file} contains forbidden construct ${forbidden}`);
  }
}

const index = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
if (!index.includes(`connect-src 'self' ${counterOrigin}`)) {
  throw new Error("counter origin is not explicitly allowed by the portal CSP");
}

const app = await fs.readFile(new URL("../assets/app.mjs", import.meta.url), "utf8");
if (!app.includes(`const COUNTER_OPEN_URL = "${counterOrigin}/api/open";`) ||
    !app.includes("recordFirstOpen(opened.recordId);") ||
    !app.includes("body: JSON.stringify({ recordId })")) {
  throw new Error("privacy-minimized post-decryption counter hook is missing");
}
const counterHook = app.slice(
  app.indexOf("function recordFirstOpen"),
  app.indexOf("form.addEventListener"),
);
for (const confidentialValue of ["accessCode", "markdown", "envelope", "input.value"]) {
  if (counterHook.includes(confidentialValue)) {
    throw new Error(`counter payload includes confidential value ${confidentialValue}`);
  }
}
process.stdout.write("portal static security checks ok\n");
