import { loadIndex, normalize, initialQuery, safeUrl, searchIndex, suggestCorrection, types, categories, pageSize } from './search-index.js';

const root = document.getElementById('local-search');
const form = document.getElementById('ntgc-site-search');
const input = document.getElementById('search');
const status = document.getElementById('local-search-status');
const popularTemplate = root.firstElementChild.cloneNode(true);
const icons = ['fa-layer-group', 'fa-circle-info', 'fa-file-lines', 'fa-address-book', 'fa-laptop', 'fa-handshake', 'fa-building', 'fa-newspaper', 'fa-calendar-days'];
const mobile = matchMedia('(max-width: 899px)');
let records = [];
let state = freshState('');
let revision = 0;
let ownersOpen = false;
let categoriesExpanded = false;
let filtersOpen = !mobile.matches;
let sortOpen = true;
let returnFocus;

function freshState(query) {
  return { query, type: '', categories: [], owners: [], sort: 'relevance', page: 1 };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name) {
  const node = element('span', `fas ${name}`);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

function button(text, command, value = '', className = 'local-text-button') {
  const node = element('button', className, text);
  node.type = 'button';
  node.dataset.command = command;
  node.dataset.value = value;
  return node;
}

function heading(text) {
  const node = element('h2', '', text);
  node.id = 'local-results-heading';
  node.tabIndex = -1;
  return node;
}

function showPopular(focus = false) {
  root.removeAttribute('aria-busy');
  root.replaceChildren(popularTemplate.cloneNode(true));
  status.textContent = 'Popular searches';
  if (focus) {
    root.querySelector('h2').tabIndex = -1;
    root.querySelector('h2').focus({ preventScroll: true });
  }
}

async function submitQuery(query, focus = true) {
  const current = ++revision;
  const cleaned = String(query).replace(/['\u2019]/g, '').trim();
  state = freshState(cleaned);
  ownersOpen = false;
  categoriesExpanded = false;
  input.value = cleaned;
  if (!normalize(cleaned)) {
    input.value = '';
    showPopular(focus);
    return;
  }
  const loading = element('div', 'local-search-inner');
  loading.append(heading(`Searching for "${cleaned}"`));
  root.replaceChildren(loading);
  root.setAttribute('aria-busy', 'true');
  status.textContent = 'Loading search results.';
  try {
    records = await loadIndex();
    if (current !== revision) return;
    root.removeAttribute('aria-busy');
    renderResults(focus);
  } catch {
    if (current !== revision) return;
    root.removeAttribute('aria-busy');
    const failure = element('div', 'local-search-inner local-empty');
    failure.append(heading('Search is temporarily unavailable'), element('p', '', 'The local search index could not be loaded.'), button('Try again', 'retry'));
    root.replaceChildren(failure);
    status.textContent = 'Search could not load. Try again.';
    if (focus) root.querySelector('h2').focus({ preventScroll: true });
  }
}

function highlight(text) {
  const node = element('span');
  const tokens = normalize(state.query).split(' ').filter(Boolean);
  for (const part of String(text).split(/([a-zA-Z0-9']+)/)) {
    const matched = tokens.some(token => normalize(part).startsWith(token));
    node.append(matched ? element('mark', '', part) : document.createTextNode(part));
  }
  return node;
}

function destination(text, url, recordId, className = '') {
  const href = safeUrl(url);
  if (!href) return button(text, 'record', recordId, className || 'local-text-button');
  const link = element('a', className, text);
  link.href = href;
  if (href.startsWith('https:')) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.append(document.createTextNode(' '), icon('fa-arrow-up-right-from-square'));
    link.setAttribute('aria-label', `${text} (opens in a new tab)`);
  }
  return link;
}

function renderRecord(record) {
  const article = element('article', 'local-result');
  article.dataset.recordId = record.id;
  const title = element('h3');
  title.append(destination(record.label, record.url, record.id, 'local-result-title'));
  article.append(title);
  if (record.type === 'Contact') {
    const crumbs = element('div', 'local-breadcrumbs');
    const path = ['NTG Central', ...(record.breadcrumbs || [])];
    path.forEach((part, index) => {
      if (index) crumbs.append(icon('fa-chevron-right'));
      crumbs.append(element('span', '', part));
    });
    const contact = element('div', 'local-contact');
    const details = element('div');
    if (record.role) details.append(element('p', '', record.role));
    if (record.location) details.append(element('p', '', record.location));
    if (!record.breadcrumbs?.some(part => normalize(part) === normalize(record.owner))) details.append(element('p', '', record.owner));
    const actions = element('div');
    if (record.email) {
      const demoEmail = record.demoFields?.includes('email');
      actions.append(destination(demoEmail ? 'Demo contact address' : 'Email contact', `mailto:${record.email}`, record.id));
      if (demoEmail) actions.append(element('p', 'local-updated', 'Prototype placeholder only; not a staff contact.'));
    }
    if (record.phone) actions.append(destination(record.phone, `tel:${record.phone}`, record.id));
    if (record.extension) actions.append(element('p', '', `ext. ${record.extension}`));
    contact.append(details, actions);
    const snippet = element('p', 'local-snippet');
    snippet.append(highlight(record.description));
    article.append(crumbs, contact, snippet);
  } else {
    const crumbs = element('div', 'local-breadcrumbs');
    const path = ['NTG Central', ...(record.breadcrumbs || [record.type, record.categories[0]])];
    path.forEach((part, index) => {
      if (index) crumbs.append(icon('fa-chevron-right'));
      crumbs.append(element('span', '', part));
    });
    const snippet = element('p', 'local-snippet');
    snippet.append(highlight(record.description));
    article.append(crumbs, snippet);
    if (record.type === 'Online system' || record.type === 'Enterprise service') {
      const actions = element('div', 'local-actions');
      actions.append(destination(`${record.url ? 'Open' : 'View'} ${record.label}`, record.url, record.id));
      const email = record.email || 'service-demo@example.org';
      const demoEmail = !record.email || record.demoFields?.includes('email');
      actions.append(destination(demoEmail ? 'Demo support contact' : 'Contact support', `mailto:${email}`, record.id));
      if (demoEmail) actions.append(element('p', 'local-updated', 'Prototype placeholder only; not an operational support channel.'));
      article.append(actions);
    }
  }
  if (record.updated) {
    const date = new Date(`${record.updated}T12:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const label = record.demoFields?.includes('updated') ? 'Demo date' : 'Last updated';
    article.append(element('p', 'local-updated', `${label}: ${date}`));
  }
  return article;
}

function choice(label, name, value, checked, kind, id) {
  const wrapper = element('label', 'local-choice');
  const control = element('input');
  Object.assign(control, { type: kind, name, value, checked, id });
  wrapper.htmlFor = id;
  wrapper.append(control, element('span', '', label));
  return wrapper;
}

function renderFilters(result) {
  const panel = element('details', 'local-filter-panel');
  panel.open = filtersOpen;
  panel.append(element('summary', '', 'Filter and sort'));
  panel.addEventListener('toggle', () => { filtersOpen = panel.open; });
  const content = element('div', 'local-filter-content');
  const top = element('div', 'local-filter-heading');
  top.append(element('h3', '', 'Filter and sort'), button('Clear all filters', 'clear', '', 'local-text-button local-clear'));
  content.append(top);
  const sort = element('details', 'local-sort');
  sort.open = sortOpen;
  const summary = element('summary', '', 'Sort by');
  summary.append(icon('fa-chevron-down'));
  sort.append(summary);
  sort.addEventListener('toggle', () => { sortOpen = sort.open; });
  const sorting = element('fieldset');
  const legend = element('legend', 'sr-only', 'Sort by');
  sorting.append(legend);
  for (const [value, label] of [['relevance', 'Relevance'], ['updated', 'Last updated'], ['az', 'A - Z'], ['za', 'Z - A']]) {
    sorting.append(choice(label, 'local-sort', value, state.sort === value, 'radio', `local-sort-${value}`));
  }
  sort.append(sorting);
  content.append(sort);
  const categoryGroup = element('fieldset');
  categoryGroup.append(element('legend', '', 'Category'));
  const visible = categoriesExpanded ? categories : categories.slice(0, 5);
  for (const category of categories.filter(value => visible.includes(value) || state.categories.includes(value))) {
    categoryGroup.append(choice(`${category} (${result.categoryCounts[category]})`, 'local-category', category, state.categories.includes(category), 'checkbox', `local-category-${categories.indexOf(category)}`));
  }
  const expand = button(categoriesExpanded ? 'Show fewer' : `Show all (${categories.length})`, 'categories');
  expand.id = 'local-show-categories';
  expand.setAttribute('aria-expanded', String(categoriesExpanded));
  categoryGroup.append(expand);
  content.append(categoryGroup);
  const owner = element('fieldset', 'local-owner');
  owner.append(element('legend', '', 'Content owner'));
  const trigger = button(state.owners.length ? `Selected (${state.owners.length})` : 'All content owners', 'owners', '', 'local-owner-trigger');
  trigger.id = 'local-owner-trigger';
  trigger.setAttribute('aria-expanded', String(ownersOpen));
  trigger.setAttribute('aria-controls', 'local-owner-options');
  trigger.append(icon('fa-chevron-down'));
  const options = element('div', 'local-owner-options');
  options.id = 'local-owner-options';
  options.hidden = !ownersOpen;
  Object.keys(result.ownerCounts).forEach((name, index) => {
    options.append(choice(`${name} (${result.ownerCounts[name]})`, 'local-owner', name, state.owners.includes(name), 'checkbox', `local-owner-${index}`));
  });
  owner.append(trigger, options);
  content.append(owner);
  panel.append(content);
  return panel;
}

function renderPagination(result) {
  const navigation = element('nav', 'local-pagination');
  navigation.setAttribute('aria-label', 'Search result pages');
  const previous = button('Previous', 'page', String(result.page - 1));
  previous.prepend(icon('fa-chevron-left'));
  previous.disabled = result.page === 1;
  navigation.append(previous);
  const numbers = [...new Set([1, result.page - 1, result.page, result.page + 1, result.pages])].filter(value => value >= 1 && value <= result.pages).sort((first, second) => first - second);
  let last = 0;
  for (const number of numbers) {
    if (last && number - last > 1) navigation.append(element('span', '', '...'));
    const control = button(String(number), 'page', String(number));
    control.setAttribute('aria-label', `Page ${number}`);
    if (number === result.page) control.setAttribute('aria-current', 'page');
    navigation.append(control);
    last = number;
  }
  const next = button('Next', 'page', String(result.page + 1));
  next.append(icon('fa-chevron-right'));
  next.disabled = result.page === result.pages;
  navigation.append(next);
  return navigation;
}

function renderResults(focus = false) {
  const activeId = root.contains(document.activeElement) ? document.activeElement.id : '';
  const result = searchIndex(records, state);
  state.page = result.page;
  const inner = element('div', 'local-search-inner');
  const query = element('div', 'local-query');
  const correction = suggestCorrection(records, state.query);
  if (correction) {
    const hint = element('p', '', 'Did you mean: ');
    hint.append(button(correction, 'correction', correction), document.createTextNode(' ?'));
    query.append(hint);
  }
  query.append(heading(`Showing results for "${state.query}"`));
  inner.append(query);
  const typeNavigation = element('nav', 'local-type-nav');
  typeNavigation.setAttribute('aria-label', 'Result types');
  ['', ...types].forEach((type, index) => {
    const count = type ? result.typeCounts[type] : result.allCount;
    const control = button('', 'type', type, 'local-type-button');
    control.id = `local-type-${index}`;
    control.append(icon(icons[index]), element('span', '', `${type || 'All results'} (${count})`));
    control.setAttribute('aria-pressed', String(state.type === type));
    typeNavigation.append(control);
  });
  inner.append(typeNavigation);
  const layout = element('div', 'local-results-layout');
  const column = element('div', 'local-results-column');
  if (result.total) {
    const list = element('div', 'local-result-list');
    result.records.forEach(record => list.append(renderRecord(record)));
    column.append(list, renderPagination(result));
    column.append(element('p', 'local-range', `${(result.page - 1) * pageSize + 1}-${Math.min(result.page * pageSize, result.total)} of ${result.total} results`));
  } else {
    const empty = element('div', 'local-empty');
    empty.append(element('h3', '', 'No results found'), element('p', '', 'Try another search term or remove filters.'), button('Clear all filters', 'clear'));
    column.append(empty);
  }
  layout.append(column, renderFilters(result));
  inner.append(layout);
  root.replaceChildren(inner);
  status.textContent = `${result.total} results. Page ${result.page} of ${result.pages}.`;
  if (focus) root.querySelector('#local-results-heading').focus({ preventScroll: true });
  else if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
}

const dialog = element('dialog', 'local-record-dialog');
dialog.setAttribute('aria-labelledby', 'local-record-title');
root.after(dialog);
dialog.addEventListener('close', () => returnFocus?.focus({ preventScroll: true }));
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }
});

function showRecord(id, trigger) {
  const record = records.find(value => value.id === id);
  if (!record) return;
  returnFocus = trigger;
  const title = element('h2', '', record.label);
  title.id = 'local-record-title';
  const close = button('', 'close', '', 'local-dialog-close');
  close.setAttribute('aria-label', 'Close record');
  close.title = 'Close record';
  close.append(icon('fa-xmark'));
  close.addEventListener('click', () => dialog.close());
  const details = element('dl');
  for (const [label, value] of [['Type', record.type], ['Content owner', record.owner], ['Category', record.categories.join(', ')], ['Role', record.role], ['Location', record.location]]) {
    if (value) details.append(element('dt', '', label), element('dd', '', value));
  }
  const provenance = record.source
    ? 'Imported source result. Agency owner, type and category labels are inferred for this prototype.'
    : 'Synthetic demonstration record. Not authoritative guidance.';
  dialog.replaceChildren(close, title, element('p', '', record.description), details, element('p', 'local-updated', provenance));
  if (record.email) dialog.append(destination(record.demoFields?.includes('email') ? 'Demo contact address' : record.email, `mailto:${record.email}`, id));
  dialog.showModal();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  submitQuery(input.value);
});

root.addEventListener('click', event => {
  const popular = event.target.closest('a[data-popular]');
  if (popular) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    input.value = popular.dataset.popular;
    form.requestSubmit();
    return;
  }
  const control = event.target.closest('button[data-command]');
  if (!control || control.disabled) return;
  const { command, value } = control.dataset;
  if (command === 'record') return showRecord(value, control);
  if (command === 'retry') return submitQuery(state.query);
  if (command === 'correction') {
    input.value = value;
    form.requestSubmit();
    return;
  }
  if (command === 'type') { state.type = value; state.page = 1; }
  if (command === 'page') state.page = Number(value);
  if (command === 'clear') { state = freshState(state.query); ownersOpen = false; }
  if (command === 'owners') ownersOpen = !ownersOpen;
  if (command === 'categories') categoriesExpanded = !categoriesExpanded;
  renderResults(command === 'page');
});

root.addEventListener('change', event => {
  const control = event.target;
  if (control.name === 'local-sort') state.sort = control.value;
  else if (control.name === 'local-category' || control.name === 'local-owner') {
    const key = control.name === 'local-category' ? 'categories' : 'owners';
    state[key] = control.checked ? [...state[key], control.value] : state[key].filter(value => value !== control.value);
  } else return;
  state.page = 1;
  renderResults();
});

function closeOwners() {
  ownersOpen = false;
  const trigger = root.querySelector('#local-owner-trigger');
  trigger?.setAttribute('aria-expanded', 'false');
  const options = root.querySelector('#local-owner-options');
  if (options) options.hidden = true;
}

document.addEventListener('pointerdown', event => {
  if (ownersOpen && !event.target.closest('.local-owner')) closeOwners();
});
root.addEventListener('keydown', event => {
  if (event.key === 'Escape' && ownersOpen) {
    event.preventDefault();
    closeOwners();
    root.querySelector('#local-owner-trigger')?.focus();
  }
});
root.addEventListener('focusout', event => {
  if (ownersOpen && event.target.closest('.local-owner') && event.relatedTarget && !event.relatedTarget.closest('.local-owner')) closeOwners();
});
mobile.addEventListener('change', () => {
  filtersOpen = !mobile.matches;
  const panel = root.querySelector('.local-filter-panel');
  if (panel) panel.open = filtersOpen;
});

const query = initialQuery(location.search);
if (normalize(query)) submitQuery(query, false);
else showPopular();