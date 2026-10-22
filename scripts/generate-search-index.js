import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalize, safeUrl, validateIndex } from '../Search _ NTG Central_files/search-index.js';

const scriptPath = fileURLToPath(import.meta.url);
const workspacePath = path.dirname(path.dirname(scriptPath));
const sourcePath = path.join(workspacePath, 'top1000.json');
const indexPath = path.join(workspacePath, 'Search _ NTG Central_files', 'search-suggestions.json');
const generatedIdPrefix = 'fb-';
const fallbackAgencyOwner = 'Chief Minister and Cabinet';
const multiFactorAliases = [
  'MFA',
  '2FA',
  '2SV',
  'multi-factor authentication',
  'multi factor authentication',
  'multifactor authentication',
  'two-factor authentication',
  'two factor authentication',
  'two-step authentication',
  'two-step verification',
  '2-step verification'
];

const sourceAgencyOwners = {
  'buildings-and-property': 'Corporate and Digital Development',
  'buy-goods-and-services-root-pages': 'Treasury and Finance',
  'communications-and-engagement': 'Chief Minister and Cabinet',
  'contracts-and-agreements': 'Treasury and Finance',
  'grants-or-procurement': 'Treasury and Finance',
  'ict-services-websites': 'Corporate and Digital Development',
  'it-managers-spreadsheet': 'Corporate and Digital Development',
  'legal-services': "Attorney-General's Department",
  'manage-government-information': 'Chief Minister and Cabinet',
  'managing-people-positions': 'Commissioner for Public Employment, Office of',
  'money-finance': 'Treasury and Finance',
  'my-job': 'Commissioner for Public Employment, Office of',
  'ntgcentral-root-pages': 'Chief Minister and Cabinet',
  'online-systems': 'Corporate and Digital Development',
  'our-government': 'Chief Minister and Cabinet',
  'policy_library': 'Commissioner for Public Employment, Office of',
  'procurement-in-government': 'Treasury and Finance',
  'quotes-and-tenders': 'Treasury and Finance',
  'recruit-an-employee': 'Commissioner for Public Employment, Office of',
  'safety': 'WorkSafe, NT',
  'services-and-support-root-pages': 'Chief Minister and Cabinet',
  'switchboard': 'Corporate and Digital Development',
  'test-news': 'Chief Minister and Cabinet',
  'training-calendar': 'Commissioner for Public Employment, Office of',
  'travel-fleet-vehicles': 'Logistics and Infrastructure'
};

const curatedOwnerAliases = new Map([
  ['CDC', 'Corporate and Digital Development'],
  ['Education and training', 'Education and Training'],
  ['Health', 'Health, Northern Territory'],
  ['Lands Planning and Environment', 'Lands, Planning and Environment'],
  ['NT Police force', 'Police, Fire and Emergency Services, Northern Territory'],
  ['Treasury and Finance', 'Treasury and Finance']
].map(([alias, agency]) => [normalize(alias), agency]));

const agencyTitleAliases = [
  ['Aboriginal Areas Protection Authority', ['Aboriginal Areas Protection Authority']],
  ['Administrator of the Northern Territory', ['Administrator of the Northern Territory']],
  ['Agriculture and Fisheries', ['Agriculture and Fisheries', 'Department of Agriculture and Fisheries']],
  ['Alice Springs Desert Park', ['Alice Springs Desert Park']],
  ['Anti-Discrimination Commission, Northern Territory', ['Anti-Discrimination Commission, Northern Territory']],
  ["Attorney-General's Department", ["Attorney-General's Department", 'Solicitor for the Northern Territory']],
  ['Auditor-General\'s Office, Northern Territory', ['Auditor-General\'s Office, Northern Territory']],
  ['Chief Minister and Cabinet', ['Chief Minister and Cabinet', 'Department of the Chief Minister and Cabinet']],
  ['Children and Families', ['Children and Families', 'Department of Children and Families']],
  ['Children\'s Commissioner Northern Territory', ['Children\'s Commissioner Northern Territory']],
  ['Commissioner for Public Employment, Office of', ['Office of the Commissioner for Public Employment', 'Commissioner for Public Employment, Office of']],
  ['Construction Contracts Registrar', ['Construction Contracts Registrar']],
  ['Consumer Affairs, Northern Territory', ['Consumer Affairs, Northern Territory']],
  ['Corporate and Digital Development', ['Corporate and Digital Development', 'Department of Corporate and Digital Development', 'CDC', 'DCDD']],
  ['Corrections', ['Corrections', 'Department of Corrections']],
  ['Darwin Waterfront Corporation', ['Darwin Waterfront Corporation']],
  ['Defence of Darwin Experience', ['Defence of Darwin Experience']],
  ['Education and Training', ['Education and Training', 'Department of Education and Training']],
  ['Electoral Commission, Northern Territory', ['Electoral Commission, Northern Territory']],
  ['Emergency Service, Northern Territory', ['Emergency Service, Northern Territory']],
  ['Environment Protection Authority, Northern Territory', ['Environment Protection Authority, Northern Territory']],
  ['Fire and Rescue Service, Northern Territory', ['Fire and Rescue Service, Northern Territory']],
  ['Gender Equality and Diversity, Office of', ['Gender Equality and Diversity, Office of']],
  ['Health and Community Services Complaints Commission', ['Health and Community Services Complaints Commission']],
  ['Health, Northern Territory', ['Health, Northern Territory', 'Health']],
  ['Housing, Local Government and Community Development', ['Housing, Local Government and Community Development']],
  ['Independent Commissioner Against Corruption NT, Office of', ['Independent Commissioner Against Corruption NT, Office of']],
  ['Information Commissioner Northern Territory, Office of', ['Information Commissioner Northern Territory, Office of']],
  ['Interpreting and Translating Service NT', ['Interpreting and Translating Service NT']],
  ['Jacana Energy', ['Jacana Energy']],
  ['Judicial Commission, Northern Territory', ['Judicial Commission, Northern Territory']],
  ['Land Development Corporation', ['Land Development Corporation']],
  ['Lands, Planning and Environment', ['Lands, Planning and Environment', 'Lands Planning and Environment']],
  ['Legislative Assembly of the Northern Territory', ['Legislative Assembly of the Northern Territory']],
  ['Libraries and Archives NT', ['Libraries and Archives NT']],
  ['Local Court, Northern Territory', ['Local Court, Northern Territory']],
  ['Logistics and Infrastructure', ['Logistics and Infrastructure']],
  ['Mining and Energy', ['Mining and Energy']],
  ['Office of the Integrity and Ethics Commissioner', ['Office of the Integrity and Ethics Commissioner']],
  ['Ombudsman Northern Territory', ['Ombudsman Northern Territory']],
  ['Parliament House', ['Parliament House']],
  ['Parole Board of the Northern Territory', ['Parole Board of the Northern Territory']],
  ['People, Sport and Culture', ['People, Sport and Culture']],
  ['Planning Commission, Northern Territory', ['Planning Commission, Northern Territory']],
  ['Police, Fire and Emergency Services, Northern Territory', ['Police, Fire and Emergency Services, Northern Territory', 'Police, Fire and Emergency Services', 'NT Police force']],
  ['Police Force, Northern Territory', ['Police Force, Northern Territory']],
  ['Power and Water Corporation', ['Power and Water Corporation']],
  ['Public Prosecutions Northern Territory, Director of', ['Public Prosecutions Northern Territory, Director of']],
  ['Supreme Court of the Northern Territory', ['Supreme Court of the Northern Territory']],
  ['Teacher Registration Board of the Northern Territory', ['Teacher Registration Board of the Northern Territory']],
  ['Territory Generation', ['Territory Generation']],
  ['Territory Wildlife Park', ['Territory Wildlife Park']],
  ['Tourism and Hospitality', ['Tourism and Hospitality']],
  ['Trade, Business and Asian Relations', ['Trade, Business and Asian Relations']],
  ['Treasury and Finance', ['Treasury and Finance', 'Department of Treasury and Finance']],
  ['Utilities Commission of the Northern Territory', ['Utilities Commission of the Northern Territory']],
  ['WorkSafe, NT', ['WorkSafe, NT', 'WorkSafe NT']],
  ['Office of the Parliamentary Counsel', ['Office of the Parliamentary Counsel']]
];

export const agencyOwnerLabels = [...new Set([
  fallbackAgencyOwner,
  ...Object.values(sourceAgencyOwners),
  ...curatedOwnerAliases.values(),
  ...agencyTitleAliases.map(([agency]) => agency)
])];

const categoryRules = [
  ['Career and development', /\b(career|development|learning|training|course|scholarship|mentoring|performance|merit selection)\b/],
  ['Change management', /\b(change management|organisational change|organizational change|consultation|reform|initiative|machinery of government)\b/],
  ['Employment types', /\b(employee|employment|recruitment|recruit|vacanc|leave|payroll|salary|workforce|staff)\b/],
  ['Flexible work', /\b(flexible|remote work|part.time|job share|work from home)\b/],
  ['Health and safety', /\b(health|safety|incident|emergency|injury|wellbeing|risk|hazard|first aid)\b/],
  ['Finance and procurement', /\b(finance|procurement|purchase|tender|budget|accounting|payment|pay|travel|vehicle|fleet|contract)\b/],
  ['Technology', /\b(system|portal|ict|digital|software|network|computer|application|data|cyber|website|authentication)\b/],
  ['Services and applications', /\b(service|support|request|form|application|contact|directory|representative|repair|maintenance)\b/]
];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function canonicalUrl(value) {
  const safe = safeUrl(value);
  if (!safe || !safe.startsWith('https:')) return null;
  const url = new URL(safe);
  url.hash = '';
  url.pathname = url.pathname.replace(/\/$/, '') || '/';
  url.searchParams.sort();
  return url.href;
}

function stableHash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function humanize(value) {
  return text(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
    .replace(/\bNtg\b/g, 'NTG').replace(/\bIct\b/g, 'ICT').replace(/\bHr\b/g, 'HR');
}

function keywordsFor(raw) {
  const values = [raw.thesaurusterms, raw.thesaurus, raw.sysconcepts]
    .flatMap(value => text(value).split(/[,;|]/))
    .map(value => value.trim())
    .filter(Boolean);
  return [...new Map(values.map(value => [value.toLocaleLowerCase('en-AU'), value])).values()].join(' ');
}

function aliasesFor(title, description, keywords) {
  const evidence = `${title} ${description} ${keywords}`;
  return /\b(?:multi[\s-]+factor[\s-]+authentication|multifactor[\s-]+authentication|mfa|2fa|two[\s-]+factor[\s-]+authentication|2sv|two[\s-]+step[\s-]+(?:authentication|verification)|2[\s-]+step[\s-]+verification)\b/i.test(evidence)
    ? multiFactorAliases
    : [];
}

function descriptionFor(result, raw, title) {
  const candidates = [result.excerpt, raw.suitedescription, result.summary, result.firstSentences, raw.description];
  const description = candidates.map(text).find(Boolean);
  return description || `Information about ${title}.`;
}

function contactDetailsFor(description) {
  const email = description.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0];
  const phone = description.match(/\b(?:phone|telephone)\s*:?\s*(\+?[\d][\d\s()-]*?)(?=\s+(?:internal extension|extension|email|fax|business unit)\b|$)/i)?.[1]?.trim();
  const extension = description.match(/\b(?:internal\s+)?extension\s*:?\s*(\d+)\b/i)?.[1];
  return { email, phone, extension };
}

function breadcrumbsFor(raw, url, title) {
  const lineage = text(raw.assetlineage).split('|').map(part => part.trim()).filter(Boolean);
  const parts = lineage.length ? lineage.slice(1) : new URL(url).pathname.split('/').filter(Boolean).map(humanize);
  return parts.filter(part => part.toLocaleLowerCase('en-AU') !== title.toLocaleLowerCase('en-AU') &&
    !/^[a-f\d]{8,}$/i.test(part) && !/^(suite|index|content|details)$/i.test(part)).slice(-4);
}

function inferType(result, raw, description, keywords, url) {
  const title = text(result.title || result.Title);
  const source = text(raw.syssource).toLocaleLowerCase('en-AU');
  const collection = text(raw.syscollection).toLocaleLowerCase('en-AU');
  const pathName = new URL(url).pathname.toLocaleLowerCase('en-AU');
  const titleAndTerms = `${title} ${description} ${keywords}`.toLocaleLowerCase('en-AU');
  const contactDetails = contactDetailsFor(description);
  if (source === 'online-systems' || pathName.includes('/online-systems/')) return 'Online system';
  if (collection === 'policy-library' || pathName.includes('/policy-library/')) return 'Policy';
  if (source === 'test-news' || pathName.includes('/news/')) return 'News';
  if (source === 'training-calendar' || pathName.includes('/training/') || /\b(workshop|course description|training calendar)\b/.test(titleAndTerms)) return 'Event/Training';
    if (source === 'switchboard' || /\bswitchboard\b/.test(title.toLocaleLowerCase('en-AU')) ||
      (contactDetails.email && contactDetails.phone && /\b(directory|contact|switchboard)\b/.test(titleAndTerms)) ||
      /\b(contact details|contact information|contact directory|contacts|directory|representative contacts|who to contact)\b/.test(title.toLocaleLowerCase('en-AU')) ||
      /\b(get|find|view) contact details\b/.test(description.toLocaleLowerCase('en-AU'))) return 'Contact';
  if (/\b(office of|commissioner|solicitor for the northern territory|police force|department of)\b/.test(title.toLocaleLowerCase('en-AU'))) return 'Agency';
  if (text(raw.assettype) === 'Custom Form' || /\b(service request|support service|request support|maintenance request)\b/.test(titleAndTerms)) return 'Enterprise service';
  return 'Information';
}

function categoriesFor(result, raw, description, keywords, url) {
  const corpus = `${text(result.title || result.Title)} ${description} ${keywords} ${text(raw.syssource)} ${new URL(url).pathname}`
    .toLocaleLowerCase('en-AU');
  const matched = categoryRules.filter(([, pattern]) => pattern.test(corpus)).map(([category]) => category);
  return matched.length ? matched : ['General information'];
}

function agencyOwnerFor(title, raw) {
  const normalizedTitle = normalize(title.replace(/\bDepartment of\b/gi, ' '));
  for (const [agency, aliases] of agencyTitleAliases) {
    if (aliases.some(alias => normalizedTitle === normalize(alias.replace(/\bDepartment of\b/gi, ' ')))) {
      return { owner: agency, fallback: false };
    }
  }
  const source = text(raw.syssource).toLocaleLowerCase('en-AU');
  const collection = text(raw.syscollection).toLocaleLowerCase('en-AU');
  const owner = sourceAgencyOwners[source] || (collection === 'policy-library'
    ? 'Commissioner for Public Employment, Office of'
    : null);
  return { owner: owner || fallbackAgencyOwner, fallback: !owner };
}

function dateFromSource(value) {
  if (value === undefined || value === null || value === '') return null;
  let timestamp = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  if (timestamp < 1e12) timestamp *= 1000;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2100) return null;
  return date.toISOString().slice(0, 10);
}

function demoDate(id) {
  const days = Number.parseInt(stableHash(id).slice(0, 8), 16) % 1000;
  return new Date(Date.UTC(2024, 0, 1 + days)).toISOString().slice(0, 10);
}

function markCuratedDemoFields(record) {
  const fields = new Set(record.demoFields || []);
  const owner = curatedOwnerAliases.get(normalize(record.owner)) || record.owner;
  if (record.updated) fields.add('updated');
  if (record.email?.endsWith('@example.org')) fields.add('email');
  if (record.phone) fields.add('phone');
  if (record.role) fields.add('role');
  if (record.location) fields.add('location');
  return { ...record, owner, ...(fields.size ? { demoFields: [...fields] } : {}) };
}

export function convertResults(results, curatedRecords = []) {
  if (!Array.isArray(results)) throw new Error('Funnelback response is missing its results array');
  const usedUrls = new Set(curatedRecords.map(record => canonicalUrl(record.url)).filter(Boolean));
  const records = [];
  const report = {
    sourceCount: results.length,
    mappedCount: 0,
    contactCount: 0,
    duplicateCount: 0,
    rejectedCount: 0,
    descriptionFallbacks: 0,
    categoryFallbacks: 0,
    ownerFallbacks: 0,
    demoDateCount: 0
  };

  for (const result of results) {
    const raw = result?.raw && typeof result.raw === 'object' ? result.raw : {};
    const title = text(result?.title || result?.Title || raw.systitle);
    const urlValue = result?.clickUri || result?.ClickUri || result?.uri || result?.Uri || raw.sysuri;
    const url = canonicalUrl(urlValue);
    if (!title || !url) {
      report.rejectedCount++;
      continue;
    }
    if (usedUrls.has(url)) {
      report.duplicateCount++;
      continue;
    }
    usedUrls.add(url);

    const description = descriptionFor(result, raw, title);
    const keywords = keywordsFor(raw);
    const aliases = aliasesFor(title, description, keywords);
    const type = inferType(result, raw, description, keywords, url);
    const categories = categoriesFor(result, raw, description, keywords, url);
    const ownerMapping = agencyOwnerFor(title, raw);
    const owner = ownerMapping.owner;
    const id = `${generatedIdPrefix}${stableHash(url).slice(0, 16)}`;
    const updated = dateFromSource(raw.dctermsmodified);
    const demoFields = [];
    const inferredFields = ['type', 'categories', 'owner'];
    if (!text(result.excerpt)) report.descriptionFallbacks++;
    if (categories[0] === 'General information') report.categoryFallbacks++;
    if (ownerMapping.fallback) report.ownerFallbacks++;
    if (!updated) {
      report.demoDateCount++;
      demoFields.push('updated');
    }

    const record = {
      id,
      label: title,
      type,
      description,
      categories,
      owner,
      updated: updated || demoDate(id),
      keywords,
      breadcrumbs: breadcrumbsFor(raw, url, title),
      url,
      ...(aliases.length ? { aliases } : {}),
      source: text(raw.syssource || raw.syscollection) || 'NTG Central',
      inferredFields
    };
    if (type === 'Contact') {
      const contactDetails = contactDetailsFor(description);
      if (contactDetails.email) record.email = contactDetails.email;
      else demoFields.push('email');
      if (contactDetails.phone) record.phone = contactDetails.phone;
      if (contactDetails.extension) record.extension = contactDetails.extension;
      if (!contactDetails.email) record.email = 'contact-demo@example.org';
      if (demoFields.length) record.demoFields = demoFields;
      report.contactCount++;
    } else if (type === 'Online system' || type === 'Enterprise service') {
      record.email = 'service-demo@example.org';
      record.demoFields = [...demoFields, 'email'];
    } else if (demoFields.length) {
      record.demoFields = demoFields;
    }
    records.push(record);
  }

  report.mappedCount = records.length;
  return { records, report };
}

export async function generateSearchIndex() {
  const [sourceText, indexText] = await Promise.all([
    readFile(sourcePath, 'utf8'),
    readFile(indexPath, 'utf8')
  ]);
  const response = JSON.parse(sourceText);
  const existing = JSON.parse(indexText);
  if (!Array.isArray(existing)) throw new Error('Existing search index is not an array');
  const curated = existing.filter(record => !record.id?.startsWith(generatedIdPrefix)).map(markCuratedDemoFields);
  const { records, report } = convertResults(response.results, curated);
  const merged = [...curated, ...records];
  if (validateIndex(merged).length !== merged.length) throw new Error('Generated search index failed validation');
  await writeFile(indexPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  generateSearchIndex().then(report => {
    console.log(JSON.stringify(report, null, 2));
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}