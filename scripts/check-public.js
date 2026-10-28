import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";
import { validateIndex } from "../Search _ NTG Central_files/search-index.js";
import { publicIconKit, logoAsset, sanitizeRecords } from "./build-public.js";
import { compileSearchDesignSystem, designSystemSources } from "./build-search-design-system.js";

const root = path.resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const assets = "Search _ NTG Central_files";
const designSystemCss = await readFile(path.join(root, assets, "search-design-system.css"), "utf8");
assert.equal(designSystemCss, await compileSearchDesignSystem(await designSystemSources()), "Public design-system CSS is stale");
assert.equal(designSystemCss, await readFile(path.join(root, "..", assets, "search-design-system.css"), "utf8"), "Source and public design-system CSS differ");
const expected = [
  ".nojekyll",
  "index.html",
  "Search _ NTG Central.html",
  assets,
  "release-review.json",
];
assert.deepEqual((await readdir(root)).sort(), expected.sort());
const html = await readFile(path.join(root, "index.html"), "utf8");
assert.equal(
  html,
  await readFile(path.join(root, "Search _ NTG Central.html"), "utf8"),
);
assert.ok(
  !/intra-saml|data-profile|data-personas|dataLayer|gtag\(|status-toolbar|ntgc-local-legacy|apiKey|refreshMyProfile|name="token"/i.test(
    html,
  ),
);
const localFiles = [];
let kitCount = 0;
let logoCount = 0;
const inspect = (node) => {
  const attr = (name) =>
    node.attrs?.find((item) => item.name === name)?.value || "";
  assert.ok(
    !(node.attrs || []).some((item) => /^on/i.test(item.name)),
    "Inline event handler in artifact",
  );
  if (node.tagName === "script") {
    if (attr("src") === publicIconKit) {
      kitCount++;
      assert.equal(attr("crossorigin"), "anonymous");
    } else
      assert.ok(
        attr("src").startsWith(`./${assets}/`),
        "Unapproved external script in artifact",
      );
    assert.equal(node.childNodes.length, 0, "Inline script in artifact");
  }
  if (node.tagName === "form") assert.equal(attr("action"), "./");
  if (
    node.tagName === "img" &&
    attr("class").split(/\s+/).includes("Logo_NTG_Central")
  ) {
    logoCount++;
    assert.equal(attr("src"), `./${assets}/${logoAsset}`);
    assert.equal(attr("alt"), "NTG Central");
    assert.equal(attr("width"), "86");
    assert.equal(attr("height"), "32");
  }
  if (node.tagName === "link") localFiles.push(attr("href"));
  if (["script", "img"].includes(node.tagName) && attr("src") !== publicIconKit)
    localFiles.push(attr("src"));
  for (const child of node.childNodes || []) inspect(child);
};
inspect(parse(html));
assert.ok(localFiles.indexOf(`./${assets}/search-design-system.css`) >= 0);
assert.ok(localFiles.indexOf(`./${assets}/search-design-system.css`) < localFiles.indexOf(`./${assets}/search-results.css`), "Design-system CSS must precede search layout overrides");
assert.equal(kitCount, 1, "Expected exactly one approved Font Awesome kit");
assert.equal(
  logoCount,
  2,
  "Expected header and footer to share the supplied logo",
);
assert.equal(
  await readFile(path.join(root, assets, logoAsset), "utf8"),
  await readFile(path.join(root, "..", assets, logoAsset), "utf8"),
  "Published SVG must match the supplied asset byte-for-byte",
);
for (const file of localFiles) {
  assert.ok(file.startsWith(`./${assets}/`), "Nonlocal asset");
  assert.ok(
    (await stat(path.join(root, file))).isFile(),
    `Missing local asset: ${file}`,
  );
}
const records = JSON.parse(
  await readFile(path.join(root, assets, "search-suggestions.json"), "utf8"),
);
assert.equal(records.length, 1116);
assert.equal(
  records.filter((record) => record.id.startsWith("fb-")).length,
  996,
);
assert.equal(validateIndex(records).length, records.length);
assert.deepEqual(sanitizeRecords(records), records);
const emails =
  JSON.stringify(records).match(
    /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  ) || [];
assert.ok(emails.every((email) => email.endsWith("@example.org")));
const files = await readdir(path.join(root, assets));
assert.ok(
  !files.some((file) =>
    /profile|status-toolbar|global-v2|auds|jquery|test|top1000/.test(file),
  ),
);
console.log(
  `Public artifact checks passed: ${records.length} records, ${localFiles.length} local asset references. Manual content and history approval still required.`,
);
