function safeLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeDisplayText(value) {
  return String(value)
    .replaceAll("â€”", "—")
    .replaceAll("â€“", "–");
}

function appendInline(parent, text) {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
    const token = match[0];
    if (token.startsWith("`")) {
      const code = document.createElement("code");
      code.textContent = token.slice(1, -1);
      parent.append(code);
    } else if (token.startsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = token.slice(2, -2);
      parent.append(strong);
    } else {
      const markdownLink = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token);
      const label = markdownLink ? markdownLink[1] : token;
      const href = safeLink(markdownLink ? markdownLink[2] : token.replace(/[.,;:]$/, ""));
      if (href) {
        const anchor = document.createElement("a");
        anchor.textContent = label;
        anchor.href = href;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.referrerPolicy = "no-referrer";
        parent.append(anchor);
      } else {
        parent.append(document.createTextNode(token));
      }
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
}

function cells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((item) => item.trim());
}

function isTableDivider(line) {
  const values = cells(line);
  return values.length > 0 && values.every((value) => /^:?-{3,}:?$/.test(value));
}

export function renderMarkdownSafely(markdown, target) {
  target.replaceChildren();
  const rawLines = normalizeDisplayText(markdown).replace(/\r\n?/g, "\n").split("\n");
  let start = 0;
  if (rawLines[0] === "---") {
    const end = rawLines.indexOf("---", 1);
    if (end > 0) start = end + 1;
  }
  const lines = rawLines.slice(start);
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const element = document.createElement(`h${heading[1].length}`);
      appendInline(element, heading[2]);
      target.append(element);
      index += 1;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      target.append(document.createElement("hr"));
      index += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      const quote = document.createElement("blockquote");
      while (index < lines.length && lines[index].startsWith("> ")) {
        const row = document.createElement("div");
        appendInline(row, lines[index].slice(2).replace(/\s{2}$/, ""));
        quote.append(row);
        index += 1;
      }
      target.append(quote);
      continue;
    }
    if (line.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");
      for (const value of cells(line)) {
        const th = document.createElement("th");
        appendInline(th, value);
        headRow.append(th);
      }
      thead.append(headRow);
      table.append(thead);
      const tbody = document.createElement("tbody");
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        const row = document.createElement("tr");
        for (const value of cells(lines[index])) {
          const td = document.createElement("td");
          appendInline(td, value);
          row.append(td);
        }
        tbody.append(row);
        index += 1;
      }
      table.append(tbody);
      target.append(table);
      continue;
    }
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      const list = document.createElement(unordered ? "ul" : "ol");
      const matcher = unordered ? /^[-*]\s+(.+)$/ : /^\d+\.\s+(.+)$/;
      while (index < lines.length) {
        const match = matcher.exec(lines[index]);
        if (!match) break;
        const item = document.createElement("li");
        appendInline(item, match[1]);
        list.append(item);
        index += 1;
      }
      target.append(list);
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim()) {
      if (paragraph.length > 0 && (/^(#{1,4})\s+/.test(lines[index]) || /^[-*]\s+/.test(lines[index]) || /^\d+\.\s+/.test(lines[index]) || lines[index].startsWith("> "))) break;
      if (paragraph.length > 0 && lines[index].includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) break;
      paragraph.push(lines[index].trim());
      index += 1;
    }
    const element = document.createElement("p");
    appendInline(element, paragraph.join(" "));
    target.append(element);
  }
}
