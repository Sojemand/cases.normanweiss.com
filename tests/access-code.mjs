import { deriveRecordId, normalizeAccessCode } from "../assets/crypto.mjs";

const canonical = "ABCDEFGHJKMPQRSTVWXY";
for (const entered of [canonical, "abcd-efgh-jkmp-qrst-vwxy", "ABCD EFGH JKMP QRST VWXY"]) {
  if (normalizeAccessCode(entered) !== canonical) throw new Error("short access-code normalization failed");
}

const legacy = "A".repeat(43);
if (normalizeAccessCode(legacy) !== legacy) throw new Error("legacy access code is no longer accepted");

for (const invalid of ["ABCI-EFGH-JKMP-QRST-VWXY", "ABCL-EFGH-JKMP-QRST-VWXY", "ABCO-EFGH-JKMP-QRST-VWXY", "ABCU-EFGH-JKMP-QRST-VWXY", "A".repeat(19)]) {
  try {
    normalizeAccessCode(invalid);
    throw new Error("ambiguous or malformed short code was accepted");
  } catch (error) {
    if (error.message !== "invalid access code") throw error;
  }
}

if (!/^[0-9a-f]{64}$/.test(await deriveRecordId(canonical))) throw new Error("short code did not derive an opaque record id");

process.stdout.write("portal access-code compatibility checks ok\n");
