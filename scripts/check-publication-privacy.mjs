import fs from "node:fs";
import { execFileSync } from "node:child_process";

export const PUBLICATION_COMMIT = "Published encrypted case report";
export const PUBLICATION_BODY = "Publishes one encrypted case-report record. No plaintext, recipient identity, receipt, or access code is included.";
const PUBLICATION_BRANCH = /^codex\/publish-case-[0-9a-f]{8,64}$/;

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function publicationFilesInCommit(commit) {
  return git("diff-tree", "--root", "--no-commit-id", "--name-only", "-r", commit)
    .split(/\r?\n/)
    .filter((file) => file.startsWith("records/"));
}

export function validatePublicationMetadata({ files, title, body, headRef, messages }) {
  if (!files.some((file) => file.startsWith("records/"))) return [];
  const errors = [];
  if (title !== PUBLICATION_COMMIT) errors.push("publication PR title must be generic");
  if (body !== "" && body !== PUBLICATION_BODY) errors.push("publication PR body must be empty or the approved generic text");
  if (!PUBLICATION_BRANCH.test(headRef)) errors.push("publication branch must use an opaque record-derived suffix");
  for (const message of messages) {
    if (message !== PUBLICATION_COMMIT) errors.push("publication commit message must be exactly the approved generic text");
  }
  return errors;
}

function assertMessages(commits, ref) {
  for (const commit of commits) {
    if (publicationFilesInCommit(commit).length === 0) continue;
    const message = git("show", "-s", "--format=%B", commit).trim();
    const errors = validatePublicationMetadata({
      files: ["records/record.json"],
      title: PUBLICATION_COMMIT,
      body: "",
      headRef: ref === "refs/heads/main" ? "codex/publish-case-00000000" : ref.replace(/^refs\/heads\//, ""),
      messages: [message],
    });
    if (errors.length) throw new Error(`${commit}: ${errors.join("; ")}`);
  }
}

function commitsBetween(before, after) {
  if (/^0+$/.test(before)) {
    const listed = git("rev-list", after, "--not", "--remotes=origin");
    return listed ? listed.split(/\r?\n/) : [after];
  }
  const listed = git("rev-list", `${before}..${after}`);
  return listed ? listed.split(/\r?\n/) : [];
}

function runPrePush() {
  const input = fs.readFileSync(0, "utf8").trim();
  if (!input) return;
  for (const line of input.split(/\r?\n/)) {
    const [localRef, localSha, , remoteSha] = line.trim().split(/\s+/);
    if (!localSha || /^0+$/.test(localSha)) continue;
    assertMessages(commitsBetween(remoteSha, localSha), localRef);
  }
}

function runGitHub() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  if (process.env.GITHUB_EVENT_NAME === "pull_request") {
    const base = event.pull_request.base.sha;
    const head = event.pull_request.head.sha;
    const files = git("diff", "--name-only", `${base}...${head}`).split(/\r?\n/).filter(Boolean);
    const commits = git("rev-list", "--reverse", `${base}..${head}`).split(/\r?\n/).filter(Boolean);
    const messages = commits
      .filter((commit) => publicationFilesInCommit(commit).length > 0)
      .map((commit) => git("show", "-s", "--format=%B", commit).trim());
    const errors = validatePublicationMetadata({
      files,
      title: event.pull_request.title,
      body: event.pull_request.body ?? "",
      headRef: event.pull_request.head.ref,
      messages,
    });
    if (errors.length) throw new Error(errors.join("; "));
    return;
  }
  if (process.env.GITHUB_EVENT_NAME === "push" && event.after && event.before) {
    assertMessages(commitsBetween(event.before, event.after), event.ref);
  }
}

if (process.argv.includes("--pre-push")) runPrePush();
else if (process.env.GITHUB_ACTIONS === "true") runGitHub();
