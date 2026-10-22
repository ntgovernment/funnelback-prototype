import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalize,
  initialQuery,
  safeUrl,
  validateIndex,
  matchRecords,
  searchIndex,
  suggestCorrection,
  suggestRelatedTerms,
  types,
  categories,
  popularSearches,
  loadIndex,
} from "./search-index.js";
import {
  agencyOwnerLabels,
  convertResults,
} from "../scripts/generate-search-index.js";

const fixture = [
  {
    id: "leave",
    label: "Apply for leave",
    type: "Information",
    description: "Submit an application.",
    categories: ["Flexible work"],
    owner: "CDC",
    updated: "2026-01-01",
  },
  {
    id: "study",
    label: "Apply for study",
    type: "Policy",
    description: "Study assistance application.",
    categories: ["Career and development"],
    owner: "Education",
    updated: "2026-02-01",
  },
  {
    id: "support",
    label: "Leave support",
    type: "Contact",
    description: "Apply for leave support.",
    categories: ["Flexible work"],
    owner: "Education",
  },
];

test("normalization and initial URL query", () => {
  assert.equal(normalize("  Employee's LEAVE! "), "employees leave");
  for (const search of ["", "?searchterm=", "?foo=bar", "?searchterm=%20"])
    assert.equal(initialQuery(search), "");
  assert.equal(
    initialQuery("?searchterm=Apply%20for%20leave"),
    "Apply for leave",
  );
});
test("prefixes, AND tokens, synonyms and title relevance", () => {
  assert.equal(matchRecords(fixture, "APPLY F").length, 3);
  assert.equal(matchRecords(fixture, "applications leave").length, 2);
  assert.equal(matchRecords(fixture, "leave nonexistent").length, 0);
  assert.equal(
    searchIndex(fixture, { query: "apply for leave" }).records[0].id,
    "leave",
  );
});
test("OR within a facet, AND across groups, disjunctive facet counts", () => {
  const result = searchIndex(fixture, {
    query: "apply",
    type: "Information",
    categories: ["Flexible work", "Career and development"],
    owners: ["CDC"],
  });
  assert.equal(result.total, 1);
  assert.equal(result.typeCounts.Contact, 0);
  assert.equal(result.ownerCounts.CDC, 1);
  assert.equal(result.categoryCounts["Flexible work"], 1);
  assert.equal(
    searchIndex(fixture, {
      query: "apply",
      categories: ["Flexible work"],
      owners: ["Education"],
    }).records[0].id,
    "support",
  );
});
test("sort direction, dates with undated last, and zero matches", () => {
  assert.deepEqual(
    searchIndex(fixture, { query: "apply", sort: "updated" }).records.map(
      (record) => record.id,
    ),
    ["study", "leave", "support"],
  );
  assert.equal(
    searchIndex(fixture, { query: "apply", sort: "az" }).records[0].id,
    "leave",
  );
  assert.equal(
    searchIndex(fixture, { query: "apply", sort: "za" }).records[0].id,
    "support",
  );
  assert.equal(searchIndex(fixture, { query: "zzzz" }).total, 0);
  assert.equal(searchIndex(fixture, { query: "" }).total, 0);
});
test("pagination is ten items and clamps invalid pages", () => {
  const records = Array.from({ length: 23 }, (_, index) => ({
    ...fixture[0],
    id: `leave-${index}`,
  }));
  assert.equal(
    searchIndex(records, { query: "leave", page: 2 }).records.length,
    10,
  );
  const last = searchIndex(records, { query: "leave", page: 999 });
  assert.equal(last.page, 3);
  assert.equal(last.records.length, 3);
  assert.equal(searchIndex(records, { query: "leave", page: -1 }).page, 1);
});
test("conservative correction and safe destinations", () => {
  assert.equal(suggestCorrection(fixture, "leavve"), "leave");
  assert.equal(suggestCorrection(fixture, "ap"), null);
  assert.equal(suggestCorrection(fixture, "apply f"), null);
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("https://example.org/"), "https://example.org/");
});
test("related terms use relevant records, include indexed keywords, and cap at three", () => {
  const records = [
    {
      ...fixture[0],
      aliases: ["Leave request"],
      keywords: "annual leave approval",
    },
    {
      ...fixture[1],
      aliases: ["Study assistance"],
      keywords: "career development",
    },
    { ...fixture[2], aliases: ["Leave request"], keywords: "contact details" },
    {
      ...fixture[0],
      id: "approval",
      label: "Apply for approval",
      description: "Apply for approval.",
    },
  ];
  const suggestions = suggestRelatedTerms(records, "apply");
  assert.equal(suggestions.length, 3);
  assert.equal(new Set(suggestions.map(normalize)).size, suggestions.length);
  assert.deepEqual(suggestions, [
    "Apply for leave",
    "Leave request",
    "Apply for study",
  ]);
  assert.ok(suggestRelatedTerms([records[0]], "leave").includes("annual"));
  assert.deepEqual(
    suggestRelatedTerms(
      [
        {
          ...fixture[0],
          label: "Corporate Directory",
          keywords: "corporate directory data sources",
        },
      ],
      "Corporate Directory",
    ),
    ["data", "sources"],
  );
  assert.deepEqual(suggestRelatedTerms(fixture, "leavve").slice(0, 1), [
    "Leave support",
  ]);
  assert.deepEqual(suggestRelatedTerms(fixture, "leavve xyz"), [
    "Apply for leave",
  ]);
  assert.deepEqual(suggestRelatedTerms(fixture, "leavve unrelated terms"), []);
  assert.deepEqual(suggestRelatedTerms(fixture, "zzzz"), []);
});
test("aliases support matching and spelling corrections", () => {
  const secured = {
    ...fixture[0],
    id: "secure-sign-in",
    label: "Secure sign-in setup",
    aliases: [
      "MFA",
      "2FA",
      "multi-factor authentication",
      "multifactor authentication",
    ],
  };
  assert.equal(matchRecords([secured], "mfa")[0].record.id, "secure-sign-in");
  assert.equal(matchRecords([secured], "2fa")[0].record.id, "secure-sign-in");
  assert.equal(
    matchRecords([secured], "multifactor")[0].record.id,
    "secure-sign-in",
  );
  assert.equal(suggestCorrection([secured], "mfaa"), "mfa");
});
test("validation rejects duplicate IDs, unknown types and invalid dates", () => {
  assert.equal(
    validateIndex([
      ...fixture,
      fixture[0],
      { ...fixture[0], id: "bad", type: "Unknown" },
      { ...fixture[0], id: undefined },
      { ...fixture[0], id: "date", updated: "wrong" },
      { ...fixture[0], id: "calendar", updated: "2026-02-30" },
      { ...fixture[0], id: "alias", aliases: "MFA" },
    ]).length,
    3,
  );
});

test("Funnelback conversion maps source facts and marks deterministic fallbacks", () => {
  const source = [
    {
      title: "Union contacts",
      clickUri:
        "https://ntgcentral.nt.gov.au/services-and-support/union-contacts",
      excerpt: "Get contact details for your union representative.",
      raw: {
        syssource: "managing-people-positions",
        syscollection: "NTGC-col",
        assetlineage: "NTG Central|Services and support|Union contacts",
        sysconcepts: "union representative ; coverage",
        dctermsmodified: Date.UTC(2026, 8, 14),
      },
    },
    {
      title: "Corporate Directory",
      uri: "https://ntgcentral.nt.gov.au/online-systems/corporate-directory",
      excerpt:
        "Provides data and authentication services for business applications.",
      raw: {
        syssource: "online-systems",
        syscollection: "NTGC-col",
        assetlineage: "NTG Central|Online systems|Corporate Directory",
      },
    },
    {
      title: "NTG Switchboard",
      uri: "https://ntgcentral.nt.gov.au/phones/details?id=NTGSWITCHBOARD",
      excerpt:
        "Phone 08 8000 0000 Internal Extension 90000 Email switchboard@example.org",
      raw: {
        syssource: "switchboard",
        syscollection: "NTGC-col",
        dctermsmodified: Date.UTC(2026, 9, 7),
      },
    },
    {
      title: "Miscellaneous",
      uri: "https://ntgcentral.nt.gov.au/miscellaneous",
      raw: {},
    },
    {
      title: "Unsafe destination",
      uri: "javascript:alert(1)",
      excerpt: "This record must not be imported.",
      raw: {},
    },
    {
      title: "Duplicate URL",
      uri: "https://ntgcentral.nt.gov.au/services-and-support/union-contacts",
      excerpt: "This duplicate must not replace the first result.",
      raw: {},
    },
  ];
  const first = convertResults(source);
  const second = convertResults(source);
  assert.deepEqual(first, second);
  assert.equal(first.report.sourceCount, 6);
  assert.equal(first.report.mappedCount, 4);
  assert.equal(first.report.contactCount, 2);
  assert.equal(first.report.duplicateCount, 1);
  assert.equal(first.report.rejectedCount, 1);
  assert.equal(first.report.ownerFallbacks, 1);
  assert.equal(first.records[0].type, "Contact");
  assert.equal(
    first.records[0].owner,
    "Commissioner for Public Employment, Office of",
  );
  assert.equal(first.records[0].updated, "2026-09-14");
  assert.equal(first.records[0].email, "contact-demo@example.org");
  assert.deepEqual(first.records[0].demoFields, ["email"]);
  assert.ok(first.records[0].keywords.includes("union representative"));
  assert.deepEqual(first.records[0].breadcrumbs, ["Services and support"]);
  assert.equal(first.records[1].type, "Online system");
  assert.equal(first.records[1].owner, "Corporate and Digital Development");
  assert.equal(first.records[1].email, "service-demo@example.org");
  assert.ok(first.records[1].demoFields.includes("updated"));
  assert.equal(first.records[2].type, "Contact");
  assert.equal(first.records[2].owner, "Corporate and Digital Development");
  assert.equal(first.records[2].email, "switchboard@example.org");
  assert.equal(first.records[2].phone, "08 8000 0000");
  assert.equal(first.records[2].extension, "90000");
  assert.ok(!first.records[2].demoFields?.includes("email"));
  assert.equal(
    first.records[3].description,
    "Information about Miscellaneous.",
  );
  assert.equal(first.records[3].owner, "Chief Minister and Cabinet");
  assert.deepEqual(first.records[3].categories, ["General information"]);
  assert.ok(first.records[3].demoFields.includes("updated"));
  assert.ok(
    first.records.every((record) => validateIndex([record]).length === 1),
  );
});

test("MFA source concepts support acronym autocomplete and spelling corrections", async () => {
  const related = [
    "ICT induction",
    "Microsoft Office 365",
    "Be alert for fake Canvas emails",
  ].map((title, index) => ({
    title,
    uri: `https://example.org/mfa-${index}`,
    excerpt: "Use multi-factor authentication to protect your account.",
    raw: {
      sysconcepts:
        "MFA ; 2FA ; 2SV ; multifactor authentication ; two-factor authentication ; two-step verification",
    },
  }));
  const records = convertResults(related).records;
  assert.equal(records.length, 3);
  for (const alias of ["MFA", "2FA", "2SV"]) {
    assert.ok(records.every((record) => record.aliases.includes(alias)));
    assert.equal(matchRecords(records, alias).length, 3);
  }
  assert.ok(matchRecords(records, "multifactor").length > 0);
  assert.equal(suggestCorrection(records, "mfaa"), "mfa");
});

async function readIndex() {
  return JSON.parse(
    await readFile(
      new URL("./search-suggestions.json", import.meta.url),
      "utf8",
    ),
  );
}

test("expanded index preserves curated records and supports every popular query", async () => {
  const records = await readIndex();
  assert.equal(records.length, 1116);
  assert.equal(validateIndex(records).length, records.length);
  assert.equal(
    new Set(records.map((record) => record.id)).size,
    records.length,
  );
  assert.deepEqual(
    new Set(records.map((record) => record.type)),
    new Set(types),
  );
  assert.deepEqual(
    new Set(records.flatMap((record) => record.categories)),
    new Set(categories),
  );
  const knownAgencyOwners = new Set(agencyOwnerLabels);
  assert.ok(records.every((record) => knownAgencyOwners.has(record.owner)));
  assert.ok(records.every((record) => !/department of/i.test(record.owner)));
  assert.ok(
    records.slice(0, 120).every((record) => !record.id.startsWith("fb-")),
  );
  assert.equal(
    records.filter((record) => record.id.startsWith("fb-")).length,
    996,
  );
  assert.ok(matchRecords(records, "Apply f").length >= 30);
  for (const query of popularSearches.flat())
    assert.ok(matchRecords(records, query).length > 0, query);
  for (const record of records.filter((record) => record.type === "Contact")) {
    assert.ok(record.email);
    if (record.demoFields?.includes("email"))
      assert.ok(record.email.endsWith("@example.org"));
  }
  const sourceRecords = records.filter((record) => record.id.startsWith("fb-"));
  assert.equal(
    sourceRecords.filter((record) => record.type === "Contact").length,
    3,
  );
  assert.equal(
    sourceRecords.find((record) => record.label === "NT union contacts").type,
    "Contact",
  );
  assert.equal(
    sourceRecords.find((record) => record.label === "NT union contacts").owner,
    "Commissioner for Public Employment, Office of",
  );
  assert.equal(
    sourceRecords.find(
      (record) => record.label === "Mainframe password contacts",
    ).type,
    "Contact",
  );
  const switchboard = sourceRecords.find(
    (record) => record.label === "NTG Switchboard",
  );
  assert.equal(switchboard.type, "Contact");
  assert.equal(switchboard.email, "contact-demo@example.org");
  assert.equal(switchboard.phone, undefined);
  assert.equal(switchboard.extension, undefined);
  assert.equal(
    sourceRecords.find((record) => record.label === "Corporate Directory").type,
    "Online system",
  );
  assert.equal(
    sourceRecords.find((record) => record.label === "Corporate Directory")
      .owner,
    "Corporate and Digital Development",
  );
  const mfaRecords = sourceRecords.filter((record) =>
    record.aliases?.includes("MFA"),
  );
  assert.deepEqual(
    new Set(mfaRecords.map((record) => record.label)),
    new Set([
      "ICT induction",
      "Microsoft Office 365",
      "Be alert for fake Canvas emails",
    ]),
  );
  for (const alias of ["MFA", "2FA", "2SV"])
    assert.equal(matchRecords(mfaRecords, alias).length, 3);
  assert.equal(suggestCorrection(mfaRecords, "mfaa"), "mfa");
  assert.ok(
    matchRecords(sourceRecords, "union representative").some(
      ({ record }) => record.label === "NT union contacts",
    ),
  );
  assert.ok(
    matchRecords(sourceRecords, "mainframe password").some(
      ({ record }) => record.label === "Mainframe password contacts",
    ),
  );
  assert.ok(
    sourceRecords.every(
      (record) => !record.url || record.url.startsWith("https:"),
    ),
  );
  assert.ok(
    records.every(
      (record) =>
        !record.phone &&
        !record.extension &&
        !record.location &&
        !record.role &&
        !record.source,
    ),
  );
  assert.ok(
    records
      .filter((record) => record.demoFields?.includes("updated"))
      .every((record) => record.updated),
  );
  assert.equal(records[0].label, "Apply for leave");
  assert.equal(records[23].label, "MyForms requests and approvals");
  assert.equal(records[0].id, "apply-leave");
  assert.equal(records[23].id, "forms");
});

test("loader shares a single request and permits retry after failure", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { ok: calls > 1, json: async () => fixture };
  };
  try {
    const failure = loadIndex();
    assert.equal(loadIndex(), failure);
    await assert.rejects(failure, /unavailable/);
    const retry = loadIndex();
    assert.equal(loadIndex(), retry);
    assert.deepEqual(await retry, fixture);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
