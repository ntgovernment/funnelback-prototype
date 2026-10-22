import { parse, serialize } from "parse5";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import postcss from "postcss";
import valueParser from "postcss-value-parser";
import { validateIndex } from "../Search _ NTG Central_files/search-index.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const assets = "Search _ NTG Central_files";
const entry = "Search _ NTG Central.html";
const output = path.join(root, "dist");
export const publicIconKit = "https://kit.fontawesome.com/9bf658a5c7.js";
export const logoAsset = "ntg-central-logo.svg";
const scripts = [
  "search-index.js",
  "search-autocomplete.js",
  "search-results.js",
  "header-compact.js",
  "public-header.js",
];
const styles = [
  "main.css",
  "header-compact.css",
  "search-results-support.css",
  "search-results.css",
  "public-icons.css",
];
const emailPattern = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phonePattern =
  /(?:\+61[\s().-]*|\b0)(?:\d[\s().-]*){8,9}\b|\b(?:1800|1300)[\s.-]*\d{3}[\s.-]*\d{3}\b/g;
const allowedFields = new Set([
  "id",
  "label",
  "type",
  "description",
  "categories",
  "owner",
  "updated",
  "keywords",
  "aliases",
  "breadcrumbs",
  "url",
  "role",
  "location",
  "email",
  "phone",
  "extension",
  "source",
  "inferredFields",
  "demoFields",
]);

export function publicText(value) {
  return String(value)
    .replace(emailPattern, "contact-demo@example.org")
    .replace(phonePattern, "[demo phone]")
    .replace(
      /\b(?:internal\s+)?extension\s*:?\s*\d{3,6}\b/gi,
      "[demo extension]",
    );
}

export function sanitizeCss(source) {
  const sheet = postcss.parse(source);
  sheet.walkAtRules("import", (rule) => rule.remove());
  sheet.walkDecls((declaration) => {
    let external = false;
    valueParser(declaration.value).walk((node) => {
      if (node.type === "function" && node.value.toLowerCase() === "url") {
        const value = valueParser
          .stringify(node.nodes)
          .replace(/^["']|["']$/g, "");
        if (!value.startsWith("data:")) external = true;
      }
    });
    if (external) declaration.remove();
  });
  return sheet.toString();
}

export function publicUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    url.search = "";
    url.hash = "";
    const decoded = decodeURIComponent(url.pathname);
    if (/@|(?:token|password|secret|apikey|api-key|session)/i.test(decoded))
      return "";
    return url.href;
  } catch {
    return "";
  }
}

export function sanitizeRecords(records) {
  if (!Array.isArray(records)) throw new Error("Search data must be an array");
  const result = records.map((record) => {
    for (const field of Object.keys(record)) {
      if (!allowedFields.has(field))
        throw new Error(`Unreviewed search field: ${field}`);
    }
    const clean = {};
    for (const field of [
      "id",
      "label",
      "type",
      "description",
      "owner",
      "updated",
    ]) {
      if (record[field] !== undefined) clean[field] = publicText(record[field]);
    }
    for (const field of ["categories", "keywords", "aliases", "breadcrumbs"]) {
      if (record[field] !== undefined) {
        if (field === "keywords" && typeof record[field] === "string")
          clean[field] = publicText(record[field]);
        else {
          if (!Array.isArray(record[field]))
            throw new Error(`Invalid array: ${field}`);
          clean[field] = record[field].map(publicText);
        }
      }
    }
    const url = publicUrl(record.url);
    if (url) clean.url = url;
    if (record.demoFields)
      clean.demoFields = record.demoFields.filter(
        (field) => field === "updated",
      );
    if (record.type === "Contact" || record.email) {
      clean.email = "contact-demo@example.org";
      clean.demoFields = [...(clean.demoFields || []), "email"];
    }
    return clean;
  });
  if (validateIndex(result).length !== records.length)
    throw new Error("Public index failed validation");
  return result;
}

function attribute(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value || "";
}

function setAttribute(node, name, value) {
  const existing = node.attrs.find((item) => item.name === name);
  if (existing) existing.value = value;
  else node.attrs.push({ name, value });
}

export function sanitizeHtml(source, { development = false } = {}) {
  const document = parse(source);
  const visit = (parent) => {
    parent.childNodes = (parent.childNodes || []).filter((node) => {
      const classes = attribute(node, "class").split(/\s+/);
      const id = attribute(node, "id");
      if (node.nodeName === "#comment") return false;
      if (node.tagName === "svg" && classes.includes("Logo_NTG_Central")) {
        node.nodeName = "img";
        node.tagName = "img";
        node.namespaceURI = "http://www.w3.org/1999/xhtml";
        node.attrs = Object.entries({
          class: "Logo_NTG_Central",
          src: `./${assets}/${logoAsset}`,
          alt: "NTG Central",
          width: "86",
          height: "32",
        }).map(([name, value]) => ({ name, value }));
        node.childNodes = [];
      }
      if (
        ["iframe", "object", "embed", "status-toolbar"].includes(node.tagName)
      )
        return false;
      if (
        ["myProfile", "token"].includes(id) ||
        node.attrs?.some(
          (item) =>
            /profile|persona/i.test(item.name) &&
            item.name !== "data-personas-active",
        )
      )
        return false;
      if (
        classes.some((name) =>
          [
            "ntgc-profile",
            "ntgc-local-legacy",
            "ntgc-avatar--current-user",
            "ntgc-header__avatar",
            "ntgc-header__logo_print",
            "variant-toggle",
          ].includes(name),
        )
      )
        return false;
      if (node.tagName === "input" && attribute(node, "type") === "hidden")
        return false;
      if (node.tagName === "script") {
        const src = attribute(node, "src");
        if (
          !scripts
            .filter((file) => file !== "public-header.js")
            .some((file) => src === `./${assets}/${file}`)
        )
          return false;
      }
      if (node.tagName === "link") {
        const href = attribute(node, "href");
        if (
          !styles
            .filter((file) => file !== "public-icons.css")
            .some((file) => href === `./${assets}/${file}`)
        )
          return false;
      }
      if (
        node.tagName === "meta" &&
        /^(?:ntgc\.|dcterms\.)/.test(attribute(node, "name"))
      )
        return false;
      if (
        node.tagName === "meta" &&
        attribute(node, "http-equiv").toLowerCase() ===
          "content-security-policy"
      )
        return false;
      if (node.attrs) {
        node.attrs = node.attrs.filter(
          (item) =>
            !/^on|token|persona|profile|assetid|api-key/i.test(item.name),
        );
        for (const item of node.attrs) {
          if (["href", "src", "action"].includes(item.name)) continue;
          if (
            node.namespaceURI === "http://www.w3.org/2000/svg" &&
            [
              "d",
              "transform",
              "viewBox",
              "points",
              "x",
              "y",
              "x1",
              "y1",
              "x2",
              "y2",
              "cx",
              "cy",
              "r",
              "rx",
              "ry",
              "width",
              "height",
            ].includes(item.name)
          )
            continue;
          item.value = publicText(item.value);
        }
        if (node.tagName === "form") {
          setAttribute(node, "action", "./");
          setAttribute(node, "method", "get");
        }
        if (node.tagName === "a") {
          const href = attribute(node, "href");
          if (href.startsWith("https://ntgcentral.nt.gov.au/search#"))
            setAttribute(node, "href", `#${href.split("#")[1]}`);
          else if (/^https?:/.test(href)) {
            const safe = publicUrl(href);
            if (!safe) return false;
            setAttribute(node, "href", safe);
            setAttribute(node, "target", "_blank");
            setAttribute(node, "rel", "noopener noreferrer");
          } else if (/^(?:mailto|tel|javascript):/i.test(href)) {
            setAttribute(node, "href", "#content");
          }
        }
      }
      if (node.nodeName === "#text" && parent.tagName !== "style")
        node.value = publicText(node.value);
      if (node.tagName === "style") {
        for (const child of node.childNodes || [])
          if (child.nodeName === "#text")
            child.value = sanitizeCss(child.value);
      }
      visit(node);
      return true;
    });
  };
  visit(document);
  const head = document.childNodes
    .find((node) => node.tagName === "html")
    .childNodes.find((node) => node.tagName === "head");
  const policy = development
    ? ""
    : `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://kit.fontawesome.com https://*.fontawesome.com; style-src 'self' 'unsafe-inline' https://*.fontawesome.com; img-src 'self' data:; font-src 'self' https://*.fontawesome.com; connect-src 'self' https://*.fontawesome.com; form-action 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'">`;
  const icons = `<script src="${publicIconKit}" crossorigin="anonymous"></script>`;
  const fontPath = development
    ? "./node_modules/@fontsource/roboto"
    : `./${assets}/fonts`;
  const additions = parse(
    `<head>${policy}${icons}<link rel="stylesheet" href="${fontPath}/latin-400.css"><link rel="stylesheet" href="${fontPath}/latin-500.css"><link rel="stylesheet" href="${fontPath}/latin-700.css"><link rel="stylesheet" href="./${assets}/public-icons.css"><script defer src="./${assets}/public-header.js"></script></head>`,
  );
  const extraHead = additions.childNodes
    .find((node) => node.tagName === "html")
    .childNodes.find((node) => node.tagName === "head");
  head.childNodes.push(...extraHead.childNodes);
  return serialize(document);
}

export async function buildPublic() {
  const html = sanitizeHtml(await readFile(path.join(root, entry), "utf8"));
  const records = sanitizeRecords(
    JSON.parse(
      await readFile(
        path.join(root, assets, "search-suggestions.json"),
        "utf8",
      ),
    ),
  );
  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, assets), { recursive: true });
  for (const file of scripts)
    await cp(path.join(root, assets, file), path.join(output, assets, file));
  await cp(
    path.join(root, assets, logoAsset),
    path.join(output, assets, logoAsset),
  );
  for (const file of styles)
    await writeFile(
      path.join(output, assets, file),
      sanitizeCss(await readFile(path.join(root, assets, file), "utf8")),
    );
  await mkdir(path.join(output, assets, "fonts"), { recursive: true });
  for (const file of [
    "latin-400.css",
    "latin-500.css",
    "latin-700.css",
    "LICENSE",
  ])
    await cp(
      path.join(root, "node_modules/@fontsource/roboto", file),
      path.join(output, assets, "fonts", file),
    );
  await cp(
    path.join(root, "node_modules/@fontsource/roboto/files"),
    path.join(output, assets, "fonts/files"),
    { recursive: true },
  );
  await writeFile(path.join(output, entry), html);
  await writeFile(path.join(output, "index.html"), html);
  await writeFile(path.join(output, ".nojekyll"), "");
  const json = `${JSON.stringify(records, null, 2)}\n`;
  await writeFile(path.join(output, assets, "search-suggestions.json"), json);
  const report = {
    records: records.length,
    imported: records.filter((record) => record.id.startsWith("fb-")).length,
    indexSha256: createHash("sha256").update(json).digest("hex"),
    manualReviewRequired: true,
  };
  await writeFile(
    path.join(output, "release-review.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.includes("--sanitize-source")) {
    const html = sanitizeHtml(await readFile(path.join(root, entry), "utf8"), {
      development: true,
    });
    const records = sanitizeRecords(
      JSON.parse(
        await readFile(
          path.join(root, assets, "search-suggestions.json"),
          "utf8",
        ),
      ),
    );
    await writeFile(path.join(root, entry), html);
    await writeFile(
      path.join(root, assets, "search-suggestions.json"),
      `${JSON.stringify(records, null, 2)}\n`,
    );
    console.log(
      "Mechanically sanitized tracked HTML and JSON. History and manual content review remain required.",
    );
  } else await buildPublic();
}
