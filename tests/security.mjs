import fs from "node:fs/promises";

for (const file of ["assets/app.mjs", "assets/crypto.mjs", "assets/markdown.mjs"]) {
  const source = await fs.readFile(new URL(`../${file}`, import.meta.url), "utf8");
  for (const forbidden of ["innerHTML", "outerHTML", "eval(", "document.write", "http://cdn", "https://cdn"]) {
    if (source.includes(forbidden)) throw new Error(`${file} contains forbidden construct ${forbidden}`);
  }
}
process.stdout.write("portal static security checks ok\n");
