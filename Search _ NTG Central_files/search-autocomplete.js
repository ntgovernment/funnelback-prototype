import { loadIndex, matchRecords, normalize } from './search-index.js';

const form = document.getElementById('ntgc-site-search');
const input = document.getElementById('search');
const list = document.getElementById('search-suggestions');
const status = document.getElementById('search-suggestions-status');

if (form && input && list && status) {
  let suggestions = [];
  let matches = [];
  let activeIndex = -1;
  let composing = false;

  function closeSuggestions() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
    for (const option of list.children) {
      option.setAttribute('aria-selected', 'false');
    }
    status.textContent = '';
  }

  function updateSuggestions() {
    closeSuggestions();
    list.replaceChildren();
    matches = [];
    const query = input.value.trim();
    if (normalize(query).length < 2 || composing || document.activeElement !== input) {
      return;
    }

    matches = matchRecords(suggestions, query)
      .sort((first, second) => second.score - first.score || first.position - second.position)
      .slice(0, 6);
    matches = matches.map(({ record }) => record);

    for (const suggestion of matches) {
      const option = document.createElement('li');
      option.id = `search-option-${suggestion.id}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.textContent = suggestion.label;
      list.append(option);
    }

    list.hidden = matches.length === 0;
    input.setAttribute('aria-expanded', String(matches.length > 0));
    status.textContent = matches.length > 0
      ? `${matches.length} search suggestions available.`
      : 'No search suggestions.';
  }

  function selectSuggestion(index) {
    if (!matches[index]) {
      return;
    }
    input.value = matches[index].label;
    closeSuggestions();
    input.focus();
  }

  input.addEventListener('input', updateSuggestions);
  input.addEventListener('focus', updateSuggestions);
  input.addEventListener('compositionstart', () => {
    composing = true;
    closeSuggestions();
  });
  input.addEventListener('compositionend', () => {
    composing = false;
    updateSuggestions();
  });

  input.addEventListener('keydown', (event) => {
    if (event.isComposing || composing) {
      return;
    }
    if (event.key === 'Escape') {
      if (!list.hidden) {
        event.preventDefault();
      }
      closeSuggestions();
    } else if (event.key === 'Tab') {
      closeSuggestions();
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length) {
      event.preventDefault();
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      activeIndex = event.key === 'ArrowDown'
        ? (activeIndex + 1) % matches.length
        : (activeIndex <= 0 ? matches.length : activeIndex) - 1;
      for (const [index, option] of Array.from(list.children).entries()) {
        option.setAttribute('aria-selected', String(index === activeIndex));
      }
      const activeOption = list.children[activeIndex];
      input.setAttribute('aria-activedescendant', activeOption.id);
      activeOption.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && !list.hidden && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(activeIndex);
    }
  });

  list.addEventListener('pointerdown', (event) => {
    if (event.target.closest('[role="option"]')) {
      event.preventDefault();
    }
  });
  list.addEventListener('click', (event) => {
    const option = event.target.closest('[role="option"]');
    if (option && list.contains(option)) {
      selectSuggestion(Array.from(list.children).indexOf(option));
    }
  });
  form.addEventListener('focusout', (event) => {
    if (!form.contains(event.relatedTarget)) {
      closeSuggestions();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!form.contains(event.target)) {
      closeSuggestions();
    }
  });
  form.addEventListener('submit', closeSuggestions);

  loadIndex()
    .then((data) => {
      if (!Array.isArray(data)) {
        throw new Error('Invalid search suggestions');
      }
      const ids = new Set();
      suggestions = data.filter((suggestion) => {
        if (!suggestion || typeof suggestion.id !== 'string' ||
            !/^[a-z0-9-]+$/.test(suggestion.id) || ids.has(suggestion.id) ||
            typeof suggestion.label !== 'string' || !suggestion.label.trim()) {
          return false;
        }
        ids.add(suggestion.id);
        return true;
      });
      updateSuggestions();
    })
    .catch(() => {
      suggestions = [];
      matches = [];
      closeSuggestions();
    });
}