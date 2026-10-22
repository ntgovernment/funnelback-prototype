# NTG Central Search Prototype

Static NTG Central search-page snapshot served locally with Vite. The header adapts the compact-header structure while retaining the existing NTG design-system assets, search/profile content, and branding colors.

## Run

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Vite opens [Search _ NTG Central.html](Search%20_%20NTG%20Central.html) at `http://localhost:5173/`. If that port is occupied, use the next available port printed by Vite, such as `http://localhost:5174/`. Serve the page through Vite rather than opening it directly from disk: autocomplete uses a JavaScript module and fetches a local JSON file.

The supplied Font Awesome kit is authorized for `localhost`; `127.0.0.1` returns HTTP 403 and prevents icons from loading. Keep the browser on the `localhost` URL.

## Header

The utility row contains NTG Directory, NTG Policy Library, MyHR, MyForms, Noticeboard, and Online systems. MyForms points to `https://myforms.nt.gov.au/`; Online systems links to `https://ntgcentral.nt.gov.au/online-systems`.

The main menu starts with My job; the Home item has been removed. Its final Online systems item opens `https://nt.gov.au/` in a new tab. This is separate from the utility-row Online systems link.

The main header spans the viewport without a maximum-width cap, with 32px desktop edge padding and 16px mobile edge padding. Its 72px navy band (`#102040`) contains a white logo and bold Roboto navigation, a 294px by 40px white search pill, and a 40px green (`#208820`) avatar showing the current user's initial. Desktop profile controls show the avatar only; profile data and navigation destinations are unchanged.

Font Awesome is loaded from kit `https://kit.fontawesome.com/41b791824a.js` with `crossorigin="anonymous"`, replacing the local icon stylesheet. The kit provides compatibility styles for the snapshot's legacy `fas`/`fal` classes and CSS pseudo-element icons. It requires network access and `localhost` authorization. A 403 response from the kit prevents icons from rendering; check kit availability and allowed domains in Font Awesome. No additional npm dependency is needed.

At viewport widths of 1296px and above, the existing main menu is placed beside the logo, search, and profile controls. Its original-position wrapper collapses while the menu is inline so it does not leave a strip below the header. Below 1296px the menu returns to that wrapper; at 768px and below the existing mobile menu and mobile search controls are used. The JavaScript placement breakpoint and CSS breakpoint must remain synchronized. The utility dropdown closes on outside click and Escape and keeps its `aria-expanded` state synchronized.

## Search Autocomplete

The NTG Central breadcrumb above Search has been removed; the logo and navigation branding remain. The main search form now sits inside the header beneath the white Roboto bold Search heading (48px font size and line height). A 32px gap separates the title from the white search field, which is 56px high and at most 812px wide, shrinking to fit smaller screens. The input uses 16px text, 24px line height, 16px left padding, and a right-aligned search button. The compact navigation search is unchanged and does not use autocomplete.

Suggestions appear when the focused field contains at least two characters after trimming leading and trailing whitespace. Matching is case-insensitive and includes substrings, with prefix matches first and original dataset order retained within each group. Up to six matches are shown. Clearing the field, dropping below the threshold, or entering a query with no matches hides the dropdown.

Arrow keys move through suggestions; selecting with Enter or a pointer fills the field without submitting. Enter without a selected suggestion or the Search button submits to the existing live NTG Central search endpoint. Escape, Tab, and outside clicks dismiss suggestions. Search remains available if the local JSON cannot load.

The field exposes combobox/listbox roles, its expanded state and active option, and a screen-reader status announcement. Keyboard navigation keeps focus in the input; Tab moves focus normally. Suggestions are rendered as text, not HTML.

Search submission remains a native GET to `https://ntgcentral.nt.gov.au/search` with the `searchterm` parameter. The existing handler removes straight and curly apostrophes before submission. This prototype does not run a local search backend or filter the saved results using the suggestions; submitting leaves the prototype and may require access to the live NTG site.

### Editing Suggestions

[Search _ NTG Central_files/search-suggestions.json](Search%20_%20NTG%20Central_files/search-suggestions.json) contains 24 synthetic intranet task and page labels, not live search results or real staff records. Edit this array to change the available suggestions:

```json
[
	{ "id": "apply-leave", "label": "Apply for leave" },
	{ "id": "apply-flexible-work", "label": "Apply for flexible working" }
]
```

Each record needs a unique, nonempty `id` containing only lowercase ASCII letters, digits, and hyphens, plus a nonblank string `label`. Invalid records and duplicate IDs are skipped. Keep the file valid JSON, without comments or trailing commas. Reload the page after editing the data.

[Search _ NTG Central_files/search-autocomplete.js](Search%20_%20NTG%20Central_files/search-autocomplete.js) fetches the JSON once per page load, relative to its own module URL, then filters it locally on input. There are no per-keystroke API requests or additional npm dependencies. A failed request or invalid top-level JSON disables suggestions without blocking normal search submission.

## Validation

The prototype currently has only an `npm run dev` script, with no automated test, lint, or build script. Check the autocomplete controller syntax from the project root:

```bash
node --check "Search _ NTG Central_files/search-autocomplete.js"
```

For browser checks, run the prototype and verify:

1. The header has no breadcrumb above Search; the main field is 812px by 56px when space allows, with a 32px title-to-field gap.
2. Empty, whitespace-only, and one-character input show no dropdown. Typing `ap` or `Apply f` shows up to six suggestions; uppercase input matches too. An unmatched query hides the dropdown.
3. Arrow keys choose an active option. Enter or pointer selection fills the field without navigation; Escape, Tab, and outside clicks dismiss suggestions. A subsequent Enter or the Search button submits normally.
4. At 320px and 390px widths, the input and dropdown fit without horizontal scrolling. Check navigation behavior around the existing 768px and 1296px breakpoints as well.
5. In browser network tools, confirm one suggestions JSON request per reload. Block that request and reload: the dropdown stays hidden, but normal search still submits.

When verifying submission, intercept or cancel navigation to avoid relying on the authenticated live endpoint. Confirm the GET destination, `searchterm` parameter, and apostrophe cleanup.

### Known Limitations

The saved page still references remote NTG fonts, icons, analytics, and APIs. CORS restrictions, network failures, or unavailable snapshot endpoints can cause missing assets and console errors independently of autocomplete. The localhost Font Awesome restriction described above still applies. Suggestions are demonstration data, not authoritative content.

## Source Files

- [Search _ NTG Central.html](Search%20_%20NTG%20Central.html): page, header search form, and accessible autocomplete markup
- [Search _ NTG Central_files/header-compact.css](Search%20_%20NTG%20Central_files/header-compact.css): compact header, main search field, and suggestions styling
- [Search _ NTG Central_files/header-compact.js](Search%20_%20NTG%20Central_files/header-compact.js): utility dropdown and responsive main-menu placement
- [Search _ NTG Central_files/search-autocomplete.js](Search%20_%20NTG%20Central_files/search-autocomplete.js): JSON loading, matching, and autocomplete interaction
- [Search _ NTG Central_files/search-suggestions.json](Search%20_%20NTG%20Central_files/search-suggestions.json): synthetic autocomplete dataset
- [Search _ NTG Central_files/main.css](Search%20_%20NTG%20Central_files/main.css) and [Search _ NTG Central_files/global-v2.js](Search%20_%20NTG%20Central_files/global-v2.js): existing NTG design system and main-menu interactions

The matching compact-header Squiz template is maintained separately in `C:\Projects\compact-header\src\nester\`. Its export is generated with `npm run build` in that separate repository; this prototype has no build script. Changes here do not automatically update the Squiz template. Validate retained Squiz asset IDs in the NTG Central CMS before importing.
