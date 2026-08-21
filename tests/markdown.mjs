import { normalizeDisplayText } from "../assets/markdown.mjs";

const input = "CT05 â€” OTHER COURT DEPOSITS; 2024â€“2026";
const expected = "CT05 — OTHER COURT DEPOSITS; 2024–2026";

if (normalizeDisplayText(input) !== expected) {
  throw new Error("known UTF-8 display sequences were not normalized");
}
if (normalizeDisplayText(expected) !== expected) {
  throw new Error("valid Unicode punctuation must remain unchanged");
}

process.stdout.write("portal markdown normalization ok\n");
