const encoder = new TextEncoder();
const RECORD_PREFIX = "claim-radar-record-v1\0";
const KEY_PREFIX = "claim-radar-key-v1\0";
const ENVELOPE_FORMAT = "claim-radar-case-envelope/v1";
const PAYLOAD_FORMAT = "claim-radar-case-report/v1";

function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function fromBase64(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error("invalid envelope encoding");
  }
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function digestBytes(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", value));
}

export function normalizeAccessCode(value) {
  const normalized = String(value ?? "").trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(normalized)) {
    throw new Error("invalid access code");
  }
  return normalized;
}

export async function deriveRecordId(accessCode) {
  const code = normalizeAccessCode(accessCode);
  return bytesToHex(await digestBytes(encoder.encode(RECORD_PREFIX + code)));
}

export function recordPath(recordId) {
  if (!/^[0-9a-f]{64}$/.test(recordId)) {
    throw new Error("invalid record id");
  }
  return `records/${recordId.slice(0, 2)}/${recordId}.json`;
}

export async function decryptCaseEnvelope(envelope, accessCode) {
  const code = normalizeAccessCode(accessCode);
  const recordId = await deriveRecordId(code);
  const exactKeys = ["algorithm", "ciphertext", "format", "nonce", "record_id", "tag"];
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) ||
      Object.keys(envelope).sort().join("|") !== exactKeys.join("|") ||
      envelope.format !== ENVELOPE_FORMAT || envelope.algorithm !== "AES-256-GCM" ||
      envelope.record_id !== recordId) {
    throw new Error("invalid envelope");
  }

  const nonce = fromBase64(envelope.nonce);
  const ciphertext = fromBase64(envelope.ciphertext);
  const tag = fromBase64(envelope.tag);
  if (nonce.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("invalid envelope lengths");
  }
  const keyBytes = await digestBytes(encoder.encode(KEY_PREFIX + code));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const sealed = new Uint8Array(ciphertext.length + tag.length);
  sealed.set(ciphertext);
  sealed.set(tag, ciphertext.length);
  const additionalData = encoder.encode(`${ENVELOPE_FORMAT}\n${recordId}`);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce, additionalData, tagLength: 128 },
    key,
    sealed,
  );
  const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
  const payloadKeys = ["content_sha256", "created_at", "expires_at", "format", "markdown"];
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
      Object.keys(parsed).sort().join("|") !== payloadKeys.join("|") ||
      parsed.format !== PAYLOAD_FORMAT || typeof parsed.markdown !== "string" ||
      !/^[0-9a-f]{64}$/.test(parsed.content_sha256)) {
    throw new Error("invalid decrypted payload");
  }
  const markdownHash = bytesToHex(await digestBytes(encoder.encode(parsed.markdown)));
  if (markdownHash !== parsed.content_sha256) {
    throw new Error("report integrity mismatch");
  }
  if (parsed.expires_at !== null) {
    const expiresAt = Date.parse(parsed.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new Error("report expired");
    }
  }
  return { recordId, markdown: parsed.markdown, createdAt: parsed.created_at, expiresAt: parsed.expires_at };
}
