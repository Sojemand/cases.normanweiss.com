import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decryptCaseEnvelope, deriveRecordId, recordPath } from "../assets/crypto.mjs";

const [receiptPath, reportPath] = process.argv.slice(2);
if (!receiptPath || !reportPath) throw new Error("usage: node tests/roundtrip.mjs <receipt> <report>");
const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
const recordId = await deriveRecordId(receipt.access_code);
if (recordId !== receipt.record_id) throw new Error("record derivation mismatch");
const portalRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envelope = JSON.parse(await fs.readFile(path.join(portalRoot, recordPath(recordId)), "utf8"));
const opened = await decryptCaseEnvelope(envelope, receipt.access_code);
const expected = await fs.readFile(reportPath, "utf8");
if (opened.markdown !== expected) throw new Error("decrypted markdown mismatch");
process.stdout.write("portal crypto round trip ok\n");
