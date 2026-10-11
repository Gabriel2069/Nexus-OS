import fs from "node:fs";
import path from "node:path";
const errors = [];
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory()
        ? walk(path.join(dir, item.name))
        : [path.join(dir, item.name)],
    );
const docs = [
  "README.md",
  "DESIGN.md",
  "AGENTS.md",
  ...walk("docs").filter((file) => file.endsWith(".md")),
];
for (const file of docs.filter((file) => !file.includes("/archive/"))) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file), target)))
      errors.push(`${file}: broken link ${target}`);
  }
}
const map = fs.readFileSync("docs/PRODUCTION_MAP.md", "utf8");
const ids = [...map.matchAll(/^\|\s+([A-Z]\d\d)\s+\|/gm)].map(
  (match) => match[1],
);
if (ids.length !== new Set(ids).size) errors.push("Duplicate production ID");
if (!ids.includes("F01") || !ids.includes("D01"))
  errors.push("Missing foundation/design production IDs");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Documentation verified: ${docs.length} documents, ${ids.length} production IDs.`,
);
