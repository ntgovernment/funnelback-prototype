import {
  loadIndex,
  normalize,
  initialQuery,
  safeUrl,
  searchIndex,
  suggestRelatedTerms,
  types,
  categories,
  pageSize,
} from "./search-index.js";

const root = document.getElementById("local-search");
const form = document.getElementById("ntgc-site-search");
const input = document.getElementById("search");
const status = document.getElementById("local-search-status");
const popularTemplate = root.firstElementChild.cloneNode(true);
const icons = [
  "fa-list-check",
  "fa-circle-info",
  "fa-file-lines",
  "fa-address-book",
  "fa-globe",
  "fa-users",
  "fa-building",
  "fa-newspaper",
  "fa-calendar-days",
];
const mobile = matchMedia("(max-width: 899px)");
let records = [];
let state = freshState("");
let revision = 0;
let ownersOpen = false;
let categoriesExpanded = false;
let filtersOpen = !mobile.matches;
let sortOpen = true;
let returnFocus;
let draft;
let categoryOpen = true;
let savedOverflow;
let savedScroll;

function freshState(query) {
  return {
    query,
    type: "",
    categories: [],
    owners: [],
    sort: "relevance",
    page: 1,
  };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name, style = "fas") {
  const node = element("span", `${style} ${name}`);
  node.setAttribute("aria-hidden", "true");
  return node;
}

function button(text, command, value = "", className = "local-text-button") {
  const node = element("button", className, text);
  node.type = "button";
  node.dataset.command = command;
  node.dataset.value = value;
  return node;
}

function heading(text) {
  const node = element("h2", "", text);
  node.id = "local-results-heading";
  node.tabIndex = -1;
  return node;
}

function showPopular(focus = false) {
  root.removeAttribute("aria-busy");
  root.replaceChildren(popularTemplate.cloneNode(true));
  status.textContent = "Popular searches";
  if (focus) {
    root.querySelector("h2").tabIndex = -1;
    root.querySelector("h2").focus({ preventScroll: true });
  }
}

async function submitQuery(query, focus = true) {
  if (filterDialog.open) closeMobileFilters();
  const current = ++revision;
  const cleaned = String(query)
    .replace(/['\u2019]/g, "")
    .trim();
  state = freshState(cleaned);
  ownersOpen = false;
  categoriesExpanded = false;
  input.value = cleaned;
  if (!normalize(cleaned)) {
    input.value = "";
    showPopular(focus);
    return;
  }
  const loading = element("div", "local-search-inner");
  loading.append(heading(`Searching for "${cleaned}"`));
  root.replaceChildren(loading);
  root.setAttribute("aria-busy", "true");
  status.textContent = "Loading search results.";
  try {
    records = await loadIndex();
    if (current !== revision) return;
    root.removeAttribute("aria-busy");
    renderResults(focus);
  } catch {
    if (current !== revision) return;
    root.removeAttribute("aria-busy");
    const failure = element("div", "local-search-inner local-empty");
    failure.append(
      heading("Search is temporarily unavailable"),
      element("p", "", "The local search index could not be loaded."),
      button("Try again", "retry"),
    );
    root.replaceChildren(failure);
    status.textContent = "Search could not load. Try again.";
    if (focus) root.querySelector("h2").focus({ preventScroll: true });
  }
}

function highlight(text) {
  const node = element("span");
  const tokens = normalize(state.query).split(" ").filter(Boolean);
  for (const part of String(text).split(/([a-zA-Z0-9']+)/)) {
    const matched = tokens.some((token) => normalize(part).startsWith(token));
    node.append(
      matched ? element("mark", "", part) : document.createTextNode(part),
    );
  }
  return node;
}

function destination(text, url, recordId, className = "") {
  const href = safeUrl(url);
  if (!href)
    return button(text, "record", recordId, className || "local-text-button");
  const link = element("a", className, text);
  link.href = href;
  if (href.startsWith("https:")) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.append(
      document.createTextNode(" "),
      icon("fa-arrow-up-right-from-square"),
    );
    link.setAttribute("aria-label", `${text} (opens in a new tab)`);
  }
  return link;
}

function renderRecord(record) {
  const article = element(
    "article",
    record.type === "Contact"
      ? "local-result local-result-contact"
      : "local-result",
  );
  article.dataset.recordId = record.id;
  const title = element("h3");
  title.append(
    destination(record.label, record.url, record.id, "local-result-title"),
  );
  article.append(title);
  if (record.type === "Contact") {
    const contact = element("div", "local-contact");
    const details = element("div", "local-contact-details");
    if (record.role) details.append(element("p", "", record.role));
    if (record.owner) details.append(element("p", "", record.owner));
    const actions = element("div", "local-contact-methods");
    if (record.email)
      actions.append(
        destination(
          record.email,
          `mailto:${record.email}`,
          record.id,
          "local-contact-link",
        ),
      );
    if (record.phone || record.extension) {
      const phone = element("div", "local-contact-phone");
      if (record.phone)
        phone.append(
          destination(
            record.phone,
            `tel:${record.phone}`,
            record.id,
            "local-contact-link",
          ),
        );
      if (record.extension) {
        phone.append(element("span", "local-contact-extension-label", "ext."));
        phone.append(element("span", "local-contact-link", record.extension));
      }
      actions.append(phone);
    }
    contact.append(details, actions);
    article.append(contact);
  } else {
    const crumbs = element("div", "local-breadcrumbs");
    const path = [
      "NTG Central",
      ...(record.breadcrumbs || [record.type, record.categories[0]]),
    ];
    path.forEach((part, index) => {
      if (index) crumbs.append(icon("fa-chevron-right"));
      crumbs.append(element("span", "", part));
    });
    const snippet = element("p", "local-snippet");
    snippet.append(highlight(record.description));
    article.append(crumbs, snippet);
    if (
      record.type === "Online system" ||
      record.type === "Enterprise service"
    ) {
      const actions = element("div", "local-actions");
      actions.append(
        destination(
          `${record.url ? "Open" : "View"} ${record.label}`,
          record.url,
          record.id,
        ),
      );
      const onlineSystem = record.type === "Online system";
      const email = record.email || "service-demo@example.org";
      const demoEmail = !record.email || record.demoFields?.includes("email");
      const supportLabel = onlineSystem
        ? "Support contact"
        : demoEmail
          ? "Demo support contact"
          : "Contact support";
      const supportUrl = onlineSystem
        ? "https://jira.nt.gov.au"
        : `mailto:${email}`;
      actions.append(destination(supportLabel, supportUrl, record.id));
      if (demoEmail && !onlineSystem)
        actions.append(
          element(
            "p",
            "local-updated",
            "Prototype placeholder only; not an operational support channel.",
          ),
        );
      article.append(actions);
    }
  }
  const demoOnlineSystemDate =
    record.type === "Online system" && record.demoFields?.includes("updated");
  if (record.type !== "Contact" && record.updated && !demoOnlineSystemDate) {
    const date = new Date(`${record.updated}T12:00:00Z`).toLocaleDateString(
      "en-AU",
      { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
    );
    const label = record.demoFields?.includes("updated")
      ? "Demo date"
      : "Last updated";
    article.append(element("p", "local-updated", `${label}: ${date}`));
  }
  return article;
}

function choice(label, name, value, checked, kind, id) {
  const wrapper = element("label", "local-choice");
  const control = element("input");
  Object.assign(control, { type: kind, name, value, checked, id });
  wrapper.htmlFor = id;
  wrapper.append(control, element("span", "", label));
  return wrapper;
}

function renderFilters(result, selection = state, prefix = "local") {
  const isDraft = prefix === "mobile";
  const panel = element("details", "local-filter-panel");
  panel.open = isDraft || filtersOpen;
  panel.append(element("summary", "", "Filter and sort"));
  panel.addEventListener("toggle", () => {
    if (!isDraft) filtersOpen = panel.open;
  });
  const content = element("div", "local-filter-content");
  const top = element("div", "local-filter-heading");
  top.append(
    element("h3", "", "Filter and sort"),
    button("Clear all filters", "clear", "", "local-text-button local-clear"),
  );
  content.append(top);
  const sort = element("details", "local-sort");
  sort.open = sortOpen;
  const summary = element("summary", "", "Sort by");
  summary.append(icon("fa-chevron-down"));
  sort.append(summary);
  sort.addEventListener("toggle", () => {
    sortOpen = sort.open;
  });
  const sorting = element("fieldset");
  const legend = element("legend", "sr-only", "Sort by");
  sorting.append(legend);
  for (const [value, label] of [
    ["relevance", "Relevance"],
    ["updated", "Last updated"],
    ["az", "A - Z"],
    ["za", "Z - A"],
  ]) {
    sorting.append(
      choice(
        label,
        `${prefix}-sort`,
        value,
        selection.sort === value,
        "radio",
        `${prefix}-sort-${value}`,
      ),
    );
  }
  sort.append(sorting);
  content.append(sort);
  const categoryGroup = element("fieldset");
  categoryGroup.className = "local-category-group";
  categoryGroup.append(element("legend", "", "Category"));
  const visible = categoriesExpanded ? categories : categories.slice(0, 5);
  for (const category of categories.filter(
    (value) => visible.includes(value) || selection.categories.includes(value),
  )) {
    categoryGroup.append(
      choice(
        `${category} (${result.categoryCounts[category]})`,
        `${prefix}-category`,
        category,
        selection.categories.includes(category),
        "checkbox",
        `${prefix}-category-${categories.indexOf(category)}`,
      ),
    );
  }
  const expand = button(
    categoriesExpanded ? "Show fewer" : `Show all (${categories.length})`,
    "categories",
  );
  expand.id = `${prefix}-show-categories`;
  expand.setAttribute("aria-expanded", String(categoriesExpanded));
  categoryGroup.append(expand);
  if (isDraft) {
    const category = element("details", "local-sort local-category-section");
    category.open = categoryOpen;
    const categorySummary = element("summary", "", "Category");
    categorySummary.append(icon("fa-chevron-down"));
    category.append(categorySummary, categoryGroup);
    category.addEventListener("toggle", () => {
      categoryOpen = category.open;
    });
    content.append(category);
  } else content.append(categoryGroup);
  const owner = element("fieldset", "local-owner");
  owner.append(element("legend", "", "Content owner"));
  const trigger = button(
    isDraft || selection.owners.length
      ? `Selected (${selection.owners.length})`
      : "All content owners",
    "owners",
    "",
    "local-owner-trigger",
  );
  trigger.id = `${prefix}-owner-trigger`;
  trigger.setAttribute("aria-expanded", String(ownersOpen));
  trigger.setAttribute("aria-controls", `${prefix}-owner-options`);
  trigger.append(icon("fa-chevron-down"));
  const options = element("div", "local-owner-options");
  options.id = `${prefix}-owner-options`;
  options.hidden = !ownersOpen;
  Object.keys(result.ownerCounts).forEach((name, index) => {
    options.append(
      choice(
        `${name} (${result.ownerCounts[name]})`,
        `${prefix}-owner`,
        name,
        selection.owners.includes(name),
        "checkbox",
        `${prefix}-owner-${index}`,
      ),
    );
  });
  owner.append(trigger, options);
  content.append(owner);
  panel.append(content);
  return panel;
}

const filterDialog = element("dialog", "ntgc-local-search local-filter-dialog");
filterDialog.setAttribute("aria-labelledby", "mobile-filter-title");
const filterHeader = element("div", "local-mobile-filter-heading");
const filterTitle = element("h2", "", "Filter and sort");
filterTitle.id = "mobile-filter-title";
const filterClose = button("", "cancel", "", "local-filter-close");
filterClose.setAttribute("aria-label", "Close filter and sort");
filterClose.title = "Close filter and sort";
filterClose.append(icon("fa-xmark"));
filterHeader.append(filterTitle, filterClose);
const filterBody = element("div", "local-mobile-filter-body");
const filterFooter = element("div", "local-mobile-filter-footer");
const filterApply = button("", "apply", "", "local-filter-apply");
const filterCount = element("span");
filterCount.setAttribute("aria-live", "polite");
filterCount.setAttribute("aria-atomic", "true");
filterApply.append(filterCount);
filterFooter.append(
  filterApply,
  button("Clear all filters", "clear", "", "local-text-button local-clear"),
);
filterDialog.append(filterHeader, filterBody, filterFooter);
root.after(filterDialog);

function positionMobileFilters() {
  const band = document.querySelector(".header-wrapper--main");
  const bottom = band?.getBoundingClientRect().bottom || 0;
  filterDialog.style.setProperty("--local-filter-top", `${Math.max(0, bottom)}px`);
}

function refreshMobileFilters(rebuild = false) {
  const result = searchIndex(records, draft);
  if (rebuild) {
    const activeId = document.activeElement?.id;
    const scrollTop = filterBody.scrollTop;
    const ownerScroll = filterBody.querySelector(".local-owner-options")?.scrollTop;
    filterBody.replaceChildren(renderFilters(result, draft, "mobile"));
    if (activeId) filterBody.querySelector(`[id="${activeId}"]`)?.focus({ preventScroll: true });
    filterBody.scrollTop = scrollTop;
    if (ownerScroll) filterBody.querySelector(".local-owner-options").scrollTop = ownerScroll;
  }
  filterBody.querySelectorAll('input[name="mobile-category"], input[name="mobile-owner"]').forEach((control) => {
    const category = control.name === "mobile-category";
    control.checked = draft[category ? "categories" : "owners"].includes(control.value);
    control.nextElementSibling.textContent = `${control.value} (${(category ? result.categoryCounts : result.ownerCounts)[control.value]})`;
  });
  filterBody.querySelectorAll('input[name="mobile-sort"]').forEach((control) => {
    control.checked = control.value === draft.sort;
  });
  const trigger = filterBody.querySelector(".local-owner-trigger");
  trigger.firstChild.textContent = `Selected (${draft.owners.length})`;
  filterCount.textContent = `Show ${result.total} ${result.total === 1 ? "result" : "results"}`;
}

function openMobileFilters() {
  draft = { ...state, categories: [...state.categories], owners: [...state.owners] };
  ownersOpen = false;
  savedOverflow = document.documentElement.style.overflow;
  savedScroll = window.scrollY;
  window.scrollTo(0, 0);
  positionMobileFilters();
  refreshMobileFilters(true);
  document.documentElement.style.overflow = "hidden";
  filterDialog.showModal();
  filterBody.scrollTop = 0;
  filterClose.focus({ preventScroll: true });
}

function closeMobileFilters() {
  filterDialog.close();
  draft = undefined;
  ownersOpen = false;
  document.documentElement.style.overflow = savedOverflow;
  window.scrollTo(0, savedScroll);
  root.querySelector("#local-open-filters")?.focus({ preventScroll: true });
}

function cancelMobileFilters(event) {
  event.preventDefault();
  event.stopPropagation();
  if (ownersOpen) {
    closeOwners();
    filterBody.querySelector(".local-owner-trigger").focus();
  } else closeMobileFilters();
}
filterDialog.addEventListener("cancel", cancelMobileFilters);
filterDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") cancelMobileFilters(event);
});
filterDialog.addEventListener("click", (event) => {
  const control = event.target.closest("button[data-command]");
  if (!control) return;
  const command = control.dataset.command;
  if (command === "cancel") return closeMobileFilters();
  if (command === "apply") {
    state = { ...draft, page: 1 };
    closeMobileFilters();
    renderResults();
    root.querySelector("#local-open-filters")?.focus({ preventScroll: true });
    return;
  }
  if (command === "clear") {
    draft = freshState(state.query);
    ownersOpen = false;
  }
  if (command === "owners") ownersOpen = !ownersOpen;
  if (command === "categories") categoriesExpanded = !categoriesExpanded;
  if (command === "clear") {
    refreshMobileFilters();
    closeOwners();
  } else if (command === "owners") {
    control.setAttribute("aria-expanded", String(ownersOpen));
    filterBody.querySelector(".local-owner-options").hidden = !ownersOpen;
  } else refreshMobileFilters(true);
});
filterDialog.addEventListener("change", (event) => {
  updateSelection(draft, event.target, "mobile");
  refreshMobileFilters();
});
window.addEventListener("resize", () => {
  if (filterDialog.open) positionMobileFilters();
});

function renderPagination(result) {
  const navigation = element("nav", "local-pagination");
  navigation.setAttribute("aria-label", "Search result pages");
  const previous = button("Previous", "page", String(result.page - 1));
  previous.prepend(icon("fa-chevron-left"));
  previous.disabled = result.page === 1;
  navigation.append(previous);
  const numbers = [
    ...new Set([
      1,
      result.page - 1,
      result.page,
      result.page + 1,
      result.pages,
    ]),
  ]
    .filter((value) => value >= 1 && value <= result.pages)
    .sort((first, second) => first - second);
  let last = 0;
  for (const number of numbers) {
    if (last && number - last > 1)
      navigation.append(element("span", "", "..."));
    const control = button(String(number), "page", String(number));
    control.setAttribute("aria-label", `Page ${number}`);
    if (number === result.page) control.setAttribute("aria-current", "page");
    navigation.append(control);
    last = number;
  }
  const next = button("Next", "page", String(result.page + 1));
  next.append(icon("fa-chevron-right"));
  next.disabled = result.page === result.pages;
  navigation.append(next);
  return navigation;
}

function renderResults(focus = false) {
  const activeId = root.contains(document.activeElement)
    ? document.activeElement.id
    : "";
  const result = searchIndex(records, state);
  state.page = result.page;
  const inner = element("div", "local-search-inner");
  const query = element("div", "local-query");
  const suggestions = suggestRelatedTerms(records, state.query);
  if (suggestions.length) {
    const hint = element("p", "local-suggestions");
    hint.append(document.createTextNode("Did you mean: "));
    suggestions.forEach((suggestion, index) => {
      if (index) hint.append(document.createTextNode(", "));
      hint.append(button(suggestion, "correction", suggestion));
    });
    hint.append(document.createTextNode(" ?"));
    query.append(hint);
  }
  const range = result.total
    ? `${(result.page - 1) * pageSize + 1}-${Math.min(result.page * pageSize, result.total)} of ${result.total} results`
    : "";
  query.append(
    heading(
      result.total
        ? `Showing ${range} for "${state.query}"`
        : `Showing results for "${state.query}"`,
    ),
  );
  inner.append(query);
  const typeNavigation = element("nav", "local-type-nav");
  typeNavigation.setAttribute("aria-label", "Result types");
  ["", ...types].forEach((type, index) => {
    const count = type ? result.typeCounts[type] : result.allCount;
    const control = button("", "type", type, "local-type-button");
    control.id = `local-type-${index}`;
    control.append(
      icon(icons[index], "fal"),
      element("span", "", `${type || "All results"} (${count})`),
    );
    control.setAttribute("aria-pressed", String(state.type === type));
    typeNavigation.append(control);
  });
  inner.append(typeNavigation);
  const mobileControls = element("div", "local-mobile-controls");
  const typeLabel = element("label", "sr-only", "Result type");
  typeLabel.htmlFor = "local-type-select";
  const typeSelect = element("select", "local-type-select");
  typeSelect.id = "local-type-select";
  typeSelect.name = "local-type";
  ["", ...types].forEach((type) => {
    const count = type ? result.typeCounts[type] : result.allCount;
    const option = element("option", "", `${type || "All results"} (${count})`);
    option.value = type;
    option.selected = state.type === type;
    typeSelect.append(option);
  });
  const filterTrigger = button("", "filters", "", "local-filter-trigger");
  filterTrigger.id = "local-open-filters";
  filterTrigger.setAttribute("aria-haspopup", "dialog");
  filterTrigger.append(icon("fa-sliders-up", "fal"), element("span", "", "Filter and sort"), icon("fa-chevron-right", "fal"));
  const typeSelectWrap = element("div", "local-type-select-wrap");
  typeSelectWrap.append(typeSelect, icon("fa-chevron-down", "fal"));
  mobileControls.append(typeLabel, typeSelectWrap, filterTrigger);
  inner.append(mobileControls);
  const layout = element("div", "local-results-layout");
  const column = element("div", "local-results-column");
  if (result.total) {
    const list = element("div", "local-result-list");
    result.records.forEach((record) => list.append(renderRecord(record)));
    column.append(list, renderPagination(result));
  } else {
    const empty = element("div", "local-empty");
    empty.append(
      element("h3", "", "No results found"),
      element("p", "", "Try another search term or remove filters."),
      button("Clear all filters", "clear"),
    );
    column.append(empty);
  }
  layout.append(column, renderFilters(result));
  inner.append(layout);
  root.replaceChildren(inner);
  status.textContent = `${result.total} results. Page ${result.page} of ${result.pages}.`;
  if (focus)
    root.querySelector("#local-results-heading").focus({ preventScroll: true });
  else if (activeId)
    document.getElementById(activeId)?.focus({ preventScroll: true });
}

const dialog = element("dialog", "local-record-dialog");
dialog.setAttribute("aria-labelledby", "local-record-title");
root.after(dialog);
dialog.addEventListener("close", () =>
  returnFocus?.focus({ preventScroll: true }),
);
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  }
});

function showRecord(id, trigger) {
  const record = records.find((value) => value.id === id);
  if (!record) return;
  returnFocus = trigger;
  const title = element("h2", "", record.label);
  title.id = "local-record-title";
  const close = button("", "close", "", "local-dialog-close");
  close.setAttribute("aria-label", "Close record");
  close.title = "Close record";
  close.append(icon("fa-xmark"));
  close.addEventListener("click", () => dialog.close());
  const details = element("dl");
  for (const [label, value] of [
    ["Type", record.type],
    ["Content owner", record.owner],
    ["Category", record.categories.join(", ")],
    ["Role", record.role],
    ["Location", record.location],
  ]) {
    if (value)
      details.append(element("dt", "", label), element("dd", "", value));
  }
  const provenance = record.source
    ? "Imported source result. Agency owner, type and category labels are inferred for this prototype."
    : "Synthetic demonstration record. Not authoritative guidance.";
  dialog.replaceChildren(
    close,
    title,
    element("p", "", record.description),
    details,
    element("p", "local-updated", provenance),
  );
  if (record.email)
    dialog.append(
      destination(
        record.demoFields?.includes("email")
          ? "Demo contact address"
          : record.email,
        `mailto:${record.email}`,
        id,
      ),
    );
  dialog.showModal();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitQuery(input.value);
});

root.addEventListener("click", (event) => {
  const popular = event.target.closest("a[data-popular]");
  if (popular) {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    input.value = popular.dataset.popular;
    form.requestSubmit();
    return;
  }
  const control = event.target.closest("button[data-command]");
  if (!control || control.disabled) return;
  const { command, value } = control.dataset;
  if (command === "record") return showRecord(value, control);
  if (command === "filters") return openMobileFilters();
  if (command === "retry") return submitQuery(state.query);
  if (command === "correction") {
    input.value = value;
    form.requestSubmit();
    return;
  }
  if (command === "type") {
    state.type = value;
    state.page = 1;
  }
  if (command === "page") state.page = Number(value);
  if (command === "clear") {
    state = freshState(state.query);
    ownersOpen = false;
  }
  if (command === "owners") ownersOpen = !ownersOpen;
  if (command === "categories") categoriesExpanded = !categoriesExpanded;
  renderResults(command === "page");
});

function updateSelection(selection, control, prefix) {
  if (control.name === `${prefix}-type`) selection.type = control.value;
  else if (control.name === `${prefix}-sort`) selection.sort = control.value;
  else if (
    control.name === `${prefix}-category` ||
    control.name === `${prefix}-owner`
  ) {
    const key = control.name === `${prefix}-category` ? "categories" : "owners";
    selection[key] = control.checked
      ? [...selection[key], control.value]
      : selection[key].filter((value) => value !== control.value);
  } else return false;
  selection.page = 1;
  return true;
}

root.addEventListener("change", (event) => {
  if (!updateSelection(state, event.target, "local")) return;
  renderResults();
});

function closeOwners() {
  ownersOpen = false;
  const scope = filterDialog.open ? filterDialog : root;
  const trigger = scope.querySelector(".local-owner-trigger");
  trigger?.setAttribute("aria-expanded", "false");
  const options = scope.querySelector(".local-owner-options");
  if (options) options.hidden = true;
}

document.addEventListener("pointerdown", (event) => {
  if (ownersOpen && !event.target.closest(".local-owner")) closeOwners();
});
root.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ownersOpen) {
    event.preventDefault();
    closeOwners();
    root.querySelector("#local-owner-trigger")?.focus();
  }
});
function dismissOwnersOnFocusOut(event) {
  if (
    ownersOpen &&
    event.target.closest(".local-owner") &&
    event.relatedTarget &&
    !event.relatedTarget.closest(".local-owner")
  )
    closeOwners();
}
root.addEventListener("focusout", dismissOwnersOnFocusOut);
filterDialog.addEventListener("focusout", dismissOwnersOnFocusOut);
mobile.addEventListener("change", () => {
  if (filterDialog.open) closeMobileFilters();
  filtersOpen = !mobile.matches;
  const panel = root.querySelector(".local-filter-panel");
  if (panel) panel.open = filtersOpen;
});

const query = initialQuery(location.search);
if (normalize(query)) submitQuery(query, false);
else showPopular();
