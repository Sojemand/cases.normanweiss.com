# Lost Fund Recovery Project Case Portal

Static password-only portal for encrypted recipient case reports at `https://cases.normanweiss.com/`.

- The repository contains ciphertext only.
- A generated 256-bit access code derives both the record path and AES-256-GCM key.
- Decryption happens locally in the recipient's browser.
- No username, public index, analytics, external scripts, or third-party fonts.

Plaintext reports and publication receipts must remain outside this repository.
