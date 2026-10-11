import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
const expected = [
  "foundation",
  "motion",
  "environment",
  "components",
  "shell",
  "auth",
  ...[
    "calendar",
    "finance",
    "focus",
    "inbox",
    "insight",
    "mission",
    "now",
    "project",
    "review",
    "routine",
    "rpg",
    "section",
    "studies",
    "today",
    "tutorial",
  ].map((name) => `pages/${name}`),
];
const entry = fs.readFileSync("src/styles.css", "utf8");
const imports = [
  ...entry.matchAll(/@import ['"]\.\/styles\/(.+?)\.css['"]/g),
].map((match) => match[1]);
const errors = [];
if (JSON.stringify(imports) !== JSON.stringify(expected))
  errors.push(
    "CSS ownership/import order changed. Update STYLE_SYSTEM.md and this registry deliberately.",
  );
const frames = new Set();
const owners = new Map();
let important = 0;
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory()
        ? files(path.join(dir, item.name))
        : [path.join(dir, item.name)],
    );
}
for (const file of files("src/styles")) {
  if (!file.endsWith(".css")) continue;
  if (
    !expected.includes(path.relative("src/styles", file).replace(/\.css$/, ""))
  )
    errors.push(`Unregistered stylesheet: ${file}`);
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  root.walkAtRules((rule) => {
    if (rule.name.endsWith("keyframes")) {
      if (file !== "src/styles/motion.css")
        errors.push(`Keyframes outside motion owner: ${file}`);
      if (frames.has(rule.params))
        errors.push(`Duplicate keyframes: ${rule.params}`);
      frames.add(rule.params);
    }
    if (rule.name === "import" && file !== "src/styles/foundation.css")
      errors.push(`Nested CSS import: ${file}`);
  });
  root.walkRules((rule) => {
    if (file !== "src/styles/motion.css")
      for (const selector of postcss.list.comma(rule.selector)) {
        const previous = owners.get(selector);
        if (previous && previous !== file)
          errors.push(
            `Selector has two owners: ${selector} (${previous}, ${file})`,
          );
        owners.set(selector, file);
      }
    if (rule.selector.includes(":global"))
      errors.push(`Unsupported :global selector: ${file}`);
  });
  root.walkDecls((decl) => {
    if (decl.important) important++;
  });
}
// Existing responsive exceptions have a fixed ceiling; new styling must resolve ownership.
if (important > 243)
  errors.push(`!important budget exceeded: ${important}/243`);
for (const file of files("src").filter((file) => /\.(tsx?|css)$/.test(file))) {
  const source = fs.readFileSync(file, "utf8");
  if (/^(<<<<<<< |=======\s*$|>>>>>>> )/m.test(source))
    errors.push(`Merge marker: ${file}`);
}
if (!fs.existsSync("package-lock.json"))
  errors.push("Missing dependency lockfile");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Foundations verified: ${imports.length} CSS owners, ${frames.size} unique animations, ${important} important declarations.`,
);
