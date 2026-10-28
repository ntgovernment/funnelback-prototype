import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import nesting from "postcss-nesting";
import selectorParser from "postcss-selector-parser";
import valueParser from "postcss-value-parser";

const assets = new URL("../Search%20_%20NTG%20Central_files/", import.meta.url);
const vendor = new URL("vendor/ntg-design-system/", assets);
const scope = ":is(.ntgc-local-search, .local-record-dialog)";
const animation = "local-ntg-checkbox-checked";
const inputFiles = ["central.scoped.tokens.css", "inputs.css", "fa-solid.fa-check.white.svg"];

export async function designSystemSources() {
  return Object.fromEntries(await Promise.all(inputFiles.map(async (file) => [
    file, await readFile(new URL(file, vendor), "utf8"),
  ])));
}

export async function compileSearchDesignSystem(sources, { scoped = true } = {}) {
  const tokens = postcss.parse(sources["central.scoped.tokens.css"]);
  tokens.walkRules((rule) => {
    if (rule.selector !== ':root[theme="central"]')
      throw new Error(`Unexpected token selector: ${rule.selector}`);
    if (scoped) rule.selector = `${scope}, ${scope}::backdrop`;
  });
  const result = await postcss([nesting()]).process(sources["inputs.css"], { from: undefined });
  const controls = result.root;
  controls.walkAtRules((rule) => {
    if (rule.name === "import" || rule.name === "layer")
      throw new Error(`Unreviewed upstream at-rule: ${rule.name}`);
    if (rule.name === "keyframes") {
      if (rule.params !== "animate-checkbox-checked")
        throw new Error(`Unreviewed upstream animation: ${rule.params}`);
      rule.params = animation;
    }
  });
  controls.walkDecls((declaration) => {
    const value = valueParser(declaration.value);
    value.walk((node) => {
      if (node.type === "word" && node.value === "animate-checkbox-checked") node.value = animation;
      if (node.type !== "function" || node.value.toLowerCase() !== "url") return;
      const url = valueParser.stringify(node.nodes).replace(/^["']|["']$/g, "");
      if (url !== "./fa-solid.fa-check.white.svg") throw new Error(`Unreviewed CSS asset: ${url}`);
      node.nodes = [{ type: "string", quote: '"', value: `data:image/svg+xml,${encodeURIComponent(sources["fa-solid.fa-check.white.svg"])}` }];
    });
    declaration.value = value.toString();
  });
  controls.walkRules((rule) => {
    if (rule.parent.type === "atrule" && rule.parent.name === "keyframes") return;
    if (!scoped) return;
    rule.selector = selectorParser((selectors) => {
      selectors.each((selector) => {
        if (selector.toString() === ":root") {
          selector.replaceWith(selectorParser().astSync(scope).first.clone());
        } else {
          selector.prepend(selectorParser.combinator({ value: " " }));
          selector.prepend(selectorParser().astSync(scope).first.first.clone());
        }
      });
    }).processSync(rule.selector);
  });
  tokens.append(controls.nodes);
  tokens.walkComments((comment) => comment.remove());
  return `/* Generated from pinned NTG source by scripts/build-search-design-system.js. */\n${tokens.toString()}\n`;
}

export async function buildSearchDesignSystem() {
  const sources = await designSystemSources();
  const manifest = JSON.parse(await readFile(new URL("manifest.json", vendor), "utf8"));
  for (const [file, source] of Object.entries(sources)) {
    const checksum = createHash("sha256").update(source).digest("hex");
    if (manifest.files[file] !== checksum) throw new Error(`Pinned design-system input changed: ${file}`);
  }
  const css = await compileSearchDesignSystem(sources);
  await writeFile(new URL("search-design-system.css", assets), css);
  return css;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await buildSearchDesignSystem();