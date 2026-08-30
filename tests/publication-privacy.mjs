import {
  PUBLICATION_BODY,
  PUBLICATION_COMMIT,
  PUBLICATION_SQUASH_MESSAGE,
  validatePublicationMetadata,
} from "../scripts/check-publication-privacy.mjs";

const valid = validatePublicationMetadata({
  files: ["records/ab/abcdef.json"],
  title: PUBLICATION_COMMIT,
  body: PUBLICATION_BODY,
  headRef: "codex/publish-case-abcdef12",
  messages: [PUBLICATION_COMMIT],
});
if (valid.length !== 0) throw new Error(valid.join("; "));

const validSquash = validatePublicationMetadata({
  files: ["records/ab/abcdef.json"],
  title: PUBLICATION_COMMIT,
  body: PUBLICATION_BODY,
  headRef: "codex/publish-case-abcdef12",
  messages: [PUBLICATION_SQUASH_MESSAGE],
});
if (validSquash.length !== 0) throw new Error(validSquash.join("; "));

for (const invalid of [
  { title: "Published encrypted Acme case report" },
  { body: "Publishes the Acme report." },
  { headRef: "codex/publish-acme-case" },
  { messages: ["Published encrypted Acme case report"] },
  { messages: [`${PUBLICATION_COMMIT}\n\nPublishes the Acme report.`] },
]) {
  const errors = validatePublicationMetadata({
    files: ["records/ab/abcdef.json"],
    title: PUBLICATION_COMMIT,
    body: "",
    headRef: "codex/publish-case-abcdef12",
    messages: [PUBLICATION_COMMIT],
    ...invalid,
  });
  if (errors.length === 0) throw new Error("recipient-bearing publication metadata was accepted");
}

process.stdout.write("publication metadata privacy checks ok\n");
