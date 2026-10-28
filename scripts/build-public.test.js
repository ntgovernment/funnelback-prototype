import test from "node:test";
import assert from "node:assert/strict";
import postcss from "postcss";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { compileSearchDesignSystem, designSystemSources } from "./build-search-design-system.js";
import {
  sanitizeHtml,
  sanitizeRecords,
  sanitizeCss,
  publicText,
  publicUrl,
} from "./build-public.js";

test("public records strip contact fields and provenance without dropping records", () => {
  const records = sanitizeRecords([
    {
      id: "demo",
      label: "Help",
      type: "Contact",
      description: "Email help@agency.invalid or 08 8999 5511.",
      categories: ["General information"],
      owner: "Demo",
      keywords: "support help@agency.invalid",
      email: "help@agency.invalid",
      phone: "08 8999 5511",
      extension: "95511",
      source: "private",
      role: "staff",
      location: "office",
      url: "https://example.org/help?token=private",
    },
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].email, "contact-demo@example.org");
  assert.equal(records[0].url, "https://example.org/help");
  assert.ok(!JSON.stringify(records).includes("agency.invalid"));
  for (const field of ["phone", "extension", "source", "role", "location"])
    assert.ok(!(field in records[0]));
});

test("unreviewed fields and unsafe destinations fail closed", () => {
  assert.throws(() => sanitizeRecords([{ staffId: "private" }]), /Unreviewed/);
  for (const value of [
    "javascript:alert(1)",
    "https://user:secret@example.org/",
    "https://example.org/session/secret",
    "https://example.org/a%40example.org",
  ])
    assert.equal(publicUrl(value), "");
  assert.equal(publicText("Call 0400 123 456"), "Call [demo phone]");
});

test("public HTML removes hidden identity and executable snapshot payloads", () => {
  const html = sanitizeHtml(
    '<!doctype html><html><head><script>secret()</script></head><body><input type="hidden" value="secret"><div id="myProfile">Staff name</div><div class="ntgc-local-legacy">private</div><script src="./Search _ NTG Central_files/search-results.js" type="module"></script><form action="https://example.org/private"><input name="searchterm"></form><a href="https://example.org/?token=secret" onclick="secret()">Example</a></body></html>',
  );
  assert.ok(!/secret|Staff name|ntgc-local-legacy|onclick/.test(html));
  assert.ok(html.includes('action="./"'));
  assert.ok(html.includes("search-results.js"));
  assert.ok(
    html.includes(
      '<script src="https://kit.fontawesome.com/9bf658a5c7.js" crossorigin="anonymous"></script>',
    ),
  );
  assert.ok(
    html.includes(
      "script-src 'self' https://kit.fontawesome.com https://*.fontawesome.com",
    ),
  );
  assert.ok(!html.includes("fontawesome/css/all.min.css"));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.equal(sanitizeHtml(html), html);
});

test("snapshot CSS cannot request external or root-relative assets", () => {
  const css = sanitizeCss(
    '@import "https://example.org/font"; .demo { background:url(/?a=123); mask:url(https://example.org/a.svg); color:red; background-image:url("data:image/svg+xml,example"); font-family:"Font Awesome 5 Pro"; }',
  );
  assert.ok(!css.includes("example.org"));
  assert.ok(!css.includes("/?a="));
  assert.ok(css.includes("data:image"));
  assert.ok(css.includes("Font Awesome 5 Pro"));
});

test("Central input bundle is deterministic, scoped and safe for public CSS sanitization", async () => {
  const sources = await designSystemSources();
  const css = await compileSearchDesignSystem(sources);
  assert.equal(css, await compileSearchDesignSystem(sources));
  assert.equal(sanitizeCss(css), css);
  assert.ok(css.includes("--clr-action-pirmary:"));
  assert.ok(css.includes("data:image/svg+xml,"));
  assert.ok(css.includes("Font%20Awesome"));
  assert.ok(css.includes("local-ntg-checkbox-checked"));
  assert.ok(!css.includes(":root"));
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (rule.parent.type === "atrule" && rule.parent.name === "keyframes") return;
    for (const selector of rule.selectors)
      assert.ok(selector.startsWith(":is(.ntgc-local-search, .local-record-dialog)"), selector);
    assert.ok(!rule.nodes.some((node) => node.type === "rule"));
  });
  await assert.rejects(compileSearchDesignSystem({
    ...sources, "inputs.css": 'input { background:url(https://example.org/private.svg) }',
  }), /Unreviewed CSS asset/);
});

test("vendored inputs match their recorded checksums and consumed search tokens exist", async () => {
  const base = new URL("../Search%20_%20NTG%20Central_files/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("vendor/ntg-design-system/manifest.json", base), "utf8"));
  const sources = await designSystemSources();
  for (const [file, contents] of Object.entries(sources))
    assert.equal(createHash("sha256").update(contents).digest("hex"), manifest.files[file], file);
  const tokens = new Set();
  postcss.parse(sources["central.scoped.tokens.css"]).walkDecls((declaration) => tokens.add(declaration.prop));
  const localCss = await readFile(new URL("search-results.css", base), "utf8");
  assert.ok(!/--local-(ink|body|green|border)|#[\da-f]{3,8}\b|\bRoboto\b/i.test(localCss));
  postcss.parse(localCss).walkDecls((declaration) => {
    for (const [, token] of declaration.value.matchAll(/var\((--[\w-]+)/g))
      assert.ok(token === "--local-filter-top" || tokens.has(token), `Missing token: ${token}`);
  });
});

test("local development uses the same Pro kit without Free font overrides", () => {
  const html = sanitizeHtml(
    '<html><head></head><body><span class="fal fa-search"></span></body></html>',
    { development: true },
  );
  assert.ok(
    html.includes(
      '<script src="https://kit.fontawesome.com/9bf658a5c7.js" crossorigin="anonymous"></script>',
    ),
  );
  assert.ok(!html.includes("@fortawesome/fontawesome-free"));
  assert.ok(!html.includes("Font Awesome 7 Free"));
});

test("contact redaction preserves numeric SVG geometry", () => {
  const html = sanitizeHtml(
    '<html><head></head><body><svg viewBox="0 0 100 100"><g transform="translate(-454.021 -364.002)"><path d="M6.007-7.8-.735-2.958" aria-label="Call 0400 123 456"></path></g></svg></body></html>',
  );
  assert.ok(html.includes('transform="translate(-454.021 -364.002)"'));
  assert.ok(html.includes('d="M6.007-7.8-.735-2.958"'));
  assert.ok(html.includes('aria-label="Call [demo phone]"'));
});

test("both logos use the supplied outlined SVG without a remote font dependency", () => {
  for (const development of [false, true]) {
    const html = sanitizeHtml(
      '<html><head><link rel="stylesheet" href="https://use.typekit.net/yht7rxj.css"></head><body><svg class="Logo_NTG_Central"><text>NTG</text></svg><svg class="Logo_NTG_Central"><text>CENTRAL</text></svg></body></html>',
      { development },
    );
    assert.equal(
      html.split('src="./Search _ NTG Central_files/ntg-central-logo.svg"')
        .length - 1,
      2,
    );
    assert.equal(
      html.split('alt="NTG Central" width="86" height="32"').length - 1,
      2,
    );
    assert.ok(!html.includes("<text>"));
    assert.ok(!html.includes("typekit.net"));
    assert.equal(sanitizeHtml(html, { development }), html);
  }
});
