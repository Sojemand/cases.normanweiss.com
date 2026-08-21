# Lost Fund Recovery Project Case Portal

Static password-only portal for encrypted recipient case reports at `https://cases.normanweiss.com/`.

- The repository contains ciphertext only.
- New reports use a generated 20-character Crockford Base32 access code with 100 bits of entropy; legacy 256-bit base64url codes remain readable. The normalized code derives both the record path and AES-256-GCM key.
- Decryption happens locally in the recipient's browser.
- No username, public index, analytics, external scripts, or third-party fonts.

Plaintext reports and publication receipts must remain outside this repository.

Publication branches, commits, and pull requests must not identify a recipient. Record commits use the exact subject `Published encrypted case report`; publication branches use `codex/publish-case-<opaque-record-prefix>`. Run `git config core.hooksPath .githooks` once per checkout to enable the local push guard; GitHub Actions enforces the same metadata policy on pull requests and `main`.
