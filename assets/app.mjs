import { decryptCaseEnvelope, deriveRecordId, normalizeAccessCode, recordPath } from "./crypto.mjs";
import { renderMarkdownSafely } from "./markdown.mjs";

const form = document.querySelector("#unlock-form");
const input = document.querySelector("#access-code");
const status = document.querySelector("#status");
const unlock = document.querySelector("#unlock");
const report = document.querySelector("#report");
const reportContent = document.querySelector("#report-content");
const closeButton = document.querySelector("#close-report");

async function openReport(accessCode) {
  const code = normalizeAccessCode(accessCode);
  const recordId = await deriveRecordId(code);
  const response = await fetch(recordPath(recordId), {
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!response.ok || response.type === "opaque") throw new Error("record unavailable");
  const envelope = await response.json();
  return decryptCaseEnvelope(envelope, code);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.className = "status busy";
  status.textContent = "Opening encrypted report…";
  const button = form.querySelector("button");
  button.disabled = true;
  input.disabled = true;
  try {
    const opened = await openReport(input.value);
    input.value = "";
    renderMarkdownSafely(opened.markdown, reportContent);
    unlock.hidden = true;
    report.hidden = false;
    report.focus();
    status.textContent = "";
  } catch {
    input.value = "";
    status.className = "status error";
    status.textContent = "Access code invalid or report unavailable. / Zugangscode ungültig oder Bericht nicht verfügbar.";
    input.focus();
  } finally {
    button.disabled = false;
    input.disabled = false;
  }
});

closeButton.addEventListener("click", () => {
  reportContent.replaceChildren();
  report.hidden = true;
  unlock.hidden = false;
  status.textContent = "";
  input.focus();
});
