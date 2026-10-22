import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalize, initialQuery, safeUrl, validateIndex, matchRecords, searchIndex, suggestCorrection, types, categories, popularSearches, loadIndex } from './search-index.js';

const fixture = [
  { id: 'leave', label: 'Apply for leave', type: 'Information', description: 'Submit an application.', categories: ['Flexible work'], owner: 'CDC', updated: '2026-01-01' },
  { id: 'study', label: 'Apply for study', type: 'Policy', description: 'Study assistance application.', categories: ['Career and development'], owner: 'Education', updated: '2026-02-01' },
  { id: 'support', label: 'Leave support', type: 'Contact', description: 'Apply for leave support.', categories: ['Flexible work'], owner: 'Education' }
];

test('normalization and initial URL query', () => {
  assert.equal(normalize("  Employee's LEAVE! "), 'employees leave');
  for (const search of ['', '?searchterm=', '?foo=bar', '?searchterm=%20']) assert.equal(initialQuery(search), '');
  assert.equal(initialQuery('?searchterm=Apply%20for%20leave'), 'Apply for leave');
});
test('prefixes, AND tokens, synonyms and title relevance', () => {
  assert.equal(matchRecords(fixture, 'APPLY F').length, 3);
  assert.equal(matchRecords(fixture, 'applications leave').length, 2);
  assert.equal(matchRecords(fixture, 'leave nonexistent').length, 0);
  assert.equal(searchIndex(fixture, { query: 'apply for leave' }).records[0].id, 'leave');
});
test('OR within a facet, AND across groups, disjunctive facet counts', () => {
  const result = searchIndex(fixture, { query: 'apply', type: 'Information', categories: ['Flexible work', 'Career and development'], owners: ['CDC'] });
  assert.equal(result.total, 1);
  assert.equal(result.typeCounts.Contact, 0);
  assert.equal(result.ownerCounts.CDC, 1);
  assert.equal(result.categoryCounts['Flexible work'], 1);
  assert.equal(searchIndex(fixture, { query: 'apply', categories: ['Flexible work'], owners: ['Education'] }).records[0].id, 'support');
});
test('sort direction, dates with undated last, and zero matches', () => {
  assert.deepEqual(searchIndex(fixture, { query: 'apply', sort: 'updated' }).records.map(record => record.id), ['study', 'leave', 'support']);
  assert.equal(searchIndex(fixture, { query: 'apply', sort: 'az' }).records[0].id, 'leave');
  assert.equal(searchIndex(fixture, { query: 'apply', sort: 'za' }).records[0].id, 'support');
  assert.equal(searchIndex(fixture, { query: 'zzzz' }).total, 0);
  assert.equal(searchIndex(fixture, { query: '' }).total, 0);
});
test('pagination is ten items and clamps invalid pages', () => {
  const records = Array.from({ length: 23 }, (_, index) => ({ ...fixture[0], id: `leave-${index}` }));
  assert.equal(searchIndex(records, { query: 'leave', page: 2 }).records.length, 10);
  const last = searchIndex(records, { query: 'leave', page: 999 });
  assert.equal(last.page, 3);
  assert.equal(last.records.length, 3);
  assert.equal(searchIndex(records, { query: 'leave', page: -1 }).page, 1);
});
test('conservative correction and safe destinations', () => {
  assert.equal(suggestCorrection(fixture, 'leavve'), 'leave');
  assert.equal(suggestCorrection(fixture, 'ap'), null);
  assert.equal(suggestCorrection(fixture, 'apply f'), null);
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('https://example.org/'), 'https://example.org/');
});
test('validation rejects duplicate IDs, unknown types and invalid dates', () => {
  assert.equal(validateIndex([...fixture, fixture[0],
    { ...fixture[0], id: 'bad', type: 'Unknown' },
    { ...fixture[0], id: undefined },
    { ...fixture[0], id: 'date', updated: 'wrong' },
    { ...fixture[0], id: 'calendar', updated: '2026-02-30' }]).length, 3);
});

async function readIndex() {
  return JSON.parse(await readFile(new URL('./search-suggestions.json', import.meta.url), 'utf8'));
}

test('synthetic index is complete, valid and supports every popular query', async () => {
  const records = await readIndex();
  assert.equal(records.length, 120);
  assert.equal(validateIndex(records).length, records.length);
  assert.equal(new Set(records.map(record => record.id)).size, records.length);
  assert.deepEqual(new Set(records.map(record => record.type)), new Set(types));
  assert.deepEqual(new Set(records.flatMap(record => record.categories)), new Set(categories));
  assert.ok(matchRecords(records, 'Apply f').length >= 30);
  for (const query of popularSearches.flat()) assert.ok(matchRecords(records, query).length > 0, query);
  for (const record of records.filter(record => record.type === 'Contact')) assert.ok(record.email.endsWith('@example.org'));
  assert.equal(records[0].label, 'Apply for leave');
  assert.equal(records[23].label, 'MyForms requests and approvals');
});

test('loader shares a single request and permits retry after failure', async () => {
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