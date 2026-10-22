export const types = ['Information', 'Policy', 'Contact', 'Online system', 'Enterprise service', 'Agency', 'News', 'Event/Training'];
export const categories = ['Career and development', 'Change management', 'Employment types', 'Flexible work', 'Health and safety', 'Finance and procurement', 'Technology', 'Services and applications'];
export const popularSearches = [['My performance', 'Emergency contacts', 'myHR'], ['Apply for leave', 'Job vacancies', 'NTG Pay'], ['NTG Online Sytems', 'The latest news']];
export const pageSize = 10;

export function normalize(value = '') {
  return String(value).toLocaleLowerCase('en-AU').replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function initialQuery(search) {
  return (new URLSearchParams(search).get('searchterm') || '').replace(/['\u2019]/g, '').trim();
}

export function safeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function validateIndex(data) {
  if (!Array.isArray(data)) throw new Error('Invalid search index');
  const ids = new Set();
  return data.filter(record => {
    if (!record || typeof record.id !== 'string' || !/^[a-z0-9-]+$/.test(record.id) || ids.has(record.id) ||
        typeof record.label !== 'string' || !record.label.trim() ||
        !types.includes(record.type) || typeof record.description !== 'string' ||
        !Array.isArray(record.categories) || !record.categories.length ||
        record.categories.some(category => !categories.includes(category)) ||
        typeof record.owner !== 'string' || !record.owner.trim() ||
        (record.updated && !/^\d{4}-\d{2}-\d{2}$/.test(record.updated)) ||
        (record.updated && !Number.isFinite(Date.parse(record.updated))) ||
        (record.updated && new Date(record.updated).toISOString().slice(0, 10) !== record.updated)) return false;
    ids.add(record.id);
    return true;
  });
}

let indexPromise;
export function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(new URL('./search-suggestions.json', import.meta.url))
      .then(response => {
        if (!response.ok) throw new Error('Search index unavailable');
        return response.json();
      })
      .then(data => {
        const records = validateIndex(data);
        if (!records.length) throw new Error('Search index is empty');
        return records;
      })
      .catch(error => {
        indexPromise = undefined;
        throw error;
      });
  }
  return indexPromise;
}

function canonical(word) {
  if (/^(apply|application|applications|applying|applies)$/.test(word)) return 'apply';
  if (word === 'sytems') return 'systems';
  return word;
}

function words(value) {
  return normalize(value).split(' ').filter(Boolean).map(canonical);
}

export function matchRecords(records, query) {
  const tokens = words(query);
  if (!tokens.length) return [];
  return records.flatMap((record, position) => {
    const title = normalize(record.label);
    const titleWords = words(record.label);
    const metadata = words([record.description, record.keywords || '', record.owner,
      record.role || '', record.location || '', record.email || '', ...record.categories].join(' '));
    const allWords = [...titleWords, ...metadata];
    if (!tokens.every((token, index) => allWords.some(word => word === token ||
        (index === tokens.length - 1 && word.startsWith(token))))) return [];
    const score = (title === normalize(query) ? 100 : 0) +
      (title.startsWith(normalize(query)) ? 50 : 0) +
      (title.includes(normalize(query)) ? 20 : 0) +
      tokens.filter(token => titleWords.some(word => word.startsWith(token))).length * 10;
    return [{ record, score, position }];
  });
}

function within(record, state, except) {
  return (except === 'type' || !state.type || record.type === state.type) &&
    (except === 'categories' || !state.categories?.length || state.categories.some(category => record.categories.includes(category))) &&
    (except === 'owners' || !state.owners?.length || state.owners.includes(record.owner));
}

export function searchIndex(records, state) {
  const matches = matchRecords(records, state.query);
  const typeCounts = Object.fromEntries(types.map(type => [type, matches.filter(({ record }) => within(record, state, 'type') && record.type === type).length]));
  const categoryCounts = Object.fromEntries(categories.map(category => [category, matches.filter(({ record }) => within(record, state, 'categories') && record.categories.includes(category)).length]));
  const owners = [...new Set(records.map(record => record.owner))].sort();
  const ownerCounts = Object.fromEntries(owners.map(owner => [owner, matches.filter(({ record }) => within(record, state, 'owners') && record.owner === owner).length]));
  const filtered = matches.filter(({ record }) => within(record, state));
  filtered.sort((first, second) => {
    if (state.sort === 'updated') return (second.record.updated || '').localeCompare(first.record.updated || '') || first.record.id.localeCompare(second.record.id);
    if (state.sort === 'az' || state.sort === 'za') return first.record.label.localeCompare(second.record.label, 'en-AU') * (state.sort === 'za' ? -1 : 1) || first.record.id.localeCompare(second.record.id);
    return second.score - first.score || first.position - second.position;
  });
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(state.page) || 1)));
  return { records: filtered.slice((page - 1) * pageSize, page * pageSize).map(match => match.record),
    total, pages, page, typeCounts, categoryCounts, ownerCounts, allCount: Object.values(typeCounts).reduce((sum, count) => sum + count, 0) };
}

function distance(first, second) {
  let row = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (const [index, letter] of [...first].entries()) {
    const next = [index + 1];
    for (let column = 1; column <= second.length; column++) {
      next[column] = Math.min(next[column - 1] + 1, row[column] + 1, row[column - 1] + Number(letter !== second[column - 1]));
    }
    row = next;
  }
  return row[second.length];
}

export function suggestCorrection(records, query) {
  if (matchRecords(records, query).length) return null;
  const dictionary = [...new Set(records.flatMap(record => words(record.label)))];
  const tokens = words(query);
  let changed = false;
  const corrected = tokens.map(token => {
    if (token.length < 4 || dictionary.some(word => word.startsWith(token))) return token;
    const candidates = dictionary.map(word => ({ word, distance: distance(token, word) }))
      .filter(candidate => candidate.distance <= (token.length >= 7 ? 2 : 1))
      .sort((first, second) => first.distance - second.distance);
    if (!candidates.length || (candidates[1] && candidates[1].distance === candidates[0].distance)) return token;
    changed = true;
    return candidates[0].word;
  }).join(' ');
  return changed && matchRecords(records, corrected).length ? corrected : null;
}