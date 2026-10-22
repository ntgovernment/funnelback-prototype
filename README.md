# NTG Central Search Prototype

Interactive NTG Central search prototype served locally with Vite. A shared 120-record synthetic index powers autocomplete and a Funnelback-style results interface with content types, filters, sorting and pagination. The first-load view shows Popular searches. The existing NTG header, design-system assets and footer are retained; no search backend or AI service is required.

## Run

Requirements: npm and Node.js matching Vite 7's supported range: `^20.19.0 || >=22.12.0`.

```bash
npm install
npm run dev
```

Vite opens [Search _ NTG Central.html](Search%20_%20NTG%20Central.html) at `http://localhost:5173/`. If that port is occupied, use the next available port printed by Vite, such as `http://localhost:5174/`. Serve the page through Vite rather than opening it directly from disk: autocomplete uses a JavaScript module and fetches a local JSON file.

The supplied Font Awesome kit is authorized for `localhost`; `127.0.0.1` returns HTTP 403 and prevents icons from loading. Keep the browser on the `localhost` URL.

### Demo Walkthrough

1. Open the URL printed by Vite without a `searchterm` parameter to see Popular searches.
2. Type `Apply f` in the main search field. Select a suggestion to fill the field, then submit with Enter or the Search button.
3. Change the content type, select categories or content owners, and try the sort options. Use Next to explore additional pages when enough records match.
4. Search for `leavve` to try spelling correction. Select a result without an external destination to inspect its local demonstration record.
5. Clear the main field and submit to return to Popular searches.

Only the large main search field uses the local index. Header navigation, the compact navigation search and supplied external result links can lead to live sites that require network or NTG access.

## Header

The desktop utility row contains NTG Directory, NTG Policy Library, MyHR, MyForms, Noticeboard, and Online systems. At mobile widths (768px and below), that row is hidden and its links appear under the first hamburger-menu item, Quick links, above My job. MyForms points to `https://myforms.nt.gov.au/`; Online systems links to `https://ntgcentral.nt.gov.au/online-systems`.

The desktop main menu starts with My job; the Home item has been removed. Its final Online systems item opens `https://nt.gov.au/` in a new tab. This is separate from the utility-row Online systems link.

The main header bands span the viewport while the Quick links and main-header contents are centered and capped at 1232px. A 1px `#384560` divider sits below the desktop Quick links row. The header uses 32px desktop edge padding and 16px mobile edge padding. Its 72px navy band (`#102040`) contains a white logo and bold Roboto navigation, a 294px by 40px white search pill, and a 40px green (`#208820`) avatar showing the current user's initial. Desktop profile controls show the avatar only; profile data and navigation destinations are unchanged.

Font Awesome is loaded from kit `https://kit.fontawesome.com/41b791824a.js` with `crossorigin="anonymous"`, replacing the local icon stylesheet. The kit provides compatibility styles for the snapshot's legacy `fas`/`fal` classes and CSS pseudo-element icons. It requires network access and `localhost` authorization. A 403 response from the kit prevents icons from rendering; check kit availability and allowed domains in Font Awesome. No additional npm dependency is needed.

The main menu stays beside the logo, search, and avatar whenever the complete header row fits. It never moves into a separate white navigation row. JavaScript measures the intrinsic navigation width and available header space, checking again on resize, font loading and search expansion. When the items no longer fit, the inline navigation is replaced by a hamburger button that opens the same menu in a panel below the header. The fit threshold depends on available space and rendered content, not a fixed desktop breakpoint. At 768px and below, the mobile menu is always used and the avatar remains hidden.

The mobile panel includes Back controls for returning from submenus. The menu button supports Enter and Space, exposes `aria-controls` and `aria-expanded`, and closes on Escape or outside clicks. Switching between inline and mobile layouts closes open navigation and resets submenu state. Focus moves to visible controls when needed. The utility dropdown also closes on outside click and Escape and keeps its `aria-expanded` state synchronized.

The compact search independently collapses to an icon below 1296px; the icon is white while shown alone. Activating it expands the search field to the left while keeping the icon fixed, where it returns to the dark color on the white field. Search expansion can switch the main navigation to mobile mode if space becomes insufficient. This also applies to phones, where search retains its existing overlay behavior and the avatar stays hidden. Escape and outside clicks close the expanded search.

## Search Autocomplete

The NTG Central breadcrumb above Search has been removed; the logo and navigation branding remain. The main search form now sits inside the header beneath the white Roboto bold Search heading (48px font size and line height), with a 32px gap between the main navigation band and the heading. A 32px gap separates the title from the white search field, which is 56px high and at most 812px wide, shrinking to fit smaller screens. The input uses 16px text, 24px line height, 16px left padding, and a right-aligned search button. The compact navigation search is unchanged and does not use autocomplete.

Suggestions appear when the focused field contains at least two characters after trimming leading and trailing whitespace. Matching is case-insensitive and includes substrings, with prefix matches first and original dataset order retained within each group. Up to six matches are shown. Clearing the field, dropping below the threshold, or entering a query with no matches hides the dropdown.

Arrow keys move through suggestions; selecting with Enter or a pointer fills the field without submitting. Enter without a selected suggestion or the Search button runs local search without navigation. Escape, Tab, and outside clicks dismiss suggestions.

The field exposes combobox/listbox roles, its expanded state and active option, and a screen-reader status announcement. Keyboard navigation keeps focus in the input; Tab moves focus normally. Suggestions are rendered as text, not HTML.

The main form is intercepted by the local results controller. Straight and curly apostrophes are removed consistently with the saved page's normalization. The compact navigation search is unchanged and still uses its live destination. There is no Funnelback server or AI integration.

## Popular Searches And Local Results

The first-load body shows Popular searches when `searchterm` is missing, empty or whitespace-only. Unrelated parameters do not change this view. The eight links use the supplied three-column layout, stacking on mobile. Their labels and order are My performance, Emergency contacts, myHR; Apply for leave, Job vacancies, NTG Pay; NTG Online Sytems, The latest news. The supplied spelling of `Sytems` is retained.

Popular-search links run local searches on ordinary clicks and have encoded same-page URLs for opening in another tab. A URL such as `http://localhost:5174/Search%20_%20NTG%20Central.html?searchterm=Apply%20for%20leave` prefills the main field and initializes results. Empty submissions return to Popular searches. In-place interactions do not change browser history or rewrite the URL.

The URL is read only at startup. Refreshing restores its original query, not subsequent in-place searches or filters; browser Back does not undo those interactions. To share a query, set the `searchterm` parameter explicitly. Queries that normalize to no searchable letters or digits also show Popular searches.

Results replace only the new main content region; the header, footer and shared scripts remain intact. The saved results remain hidden. Result types are All results, Information, Policy, Contact, Online system, Enterprise service, Agency, News and Event/Training. The AI panel is intentionally omitted.

Search matches all query words across titles, descriptions, keywords, owners, categories and contact metadata. The final word can be a prefix. Matching ignores case and punctuation, recognizes application/apply variants, and ranks exact titles and title prefixes first. Conservative spelling suggestions require explicit selection; queries are never silently corrected.

- Categories and owners use OR within each group, AND across groups and the selected result type.
- Type counts respect the query and category/owner selections but ignore the active type. Each facet's counts respect the other groups while ignoring its own selections.
- Sort options are relevance, newest update, A-Z and Z-A. Undated records sort last by update date.
- Ten results appear per page. Query, type, sort and filter changes reset to page one. Clear all filters retains the query and resets type, facets, sorting and page.
- Show all expands categories. The owner selector supports multiple checkboxes, Escape, outside-click dismissal and keyboard focus restoration.
- Below 900px, collapsible filters appear before the results. Popular searches stacks below 769px.

Real, supplied external destinations open in a new tab. Records without a destination open an accessible local detail dialog rather than an invented live URL. Contact addresses use `example.org` and are not real staff details. Loading failures show a local Try again action; Popular searches does not require the index to load.

### Editing The Index

[Search _ NTG Central_files/search-suggestions.json](Search%20_%20NTG%20Central_files/search-suggestions.json) contains 120 curated synthetic records shared by autocomplete and results. The original 24 IDs/labels remain first and unchanged. This data is illustrative, not authoritative policy advice or a copy of a live index.

```json
[
	{
		"id": "apply-leave",
		"label": "Apply for leave",
		"type": "Information",
		"description": "Find the leave application process and approval steps.",
		"categories": ["Employment types"],
		"owner": "CDC",
		"updated": "2026-09-14",
		"breadcrumbs": ["My job", "Leave", "Applications"]
	}
]
```

Required fields are a unique lowercase ASCII `id` (letters, digits and hyphens), nonblank `label`, recognized `type`, `description`, nonempty recognized `categories` array and nonblank `owner`. Optional `updated` dates must be valid `YYYY-MM-DD` calendar dates. Optional fields include `keywords`, `breadcrumbs`, `url`, `role`, `location`, `email`, `phone` and `extension`. Category/type vocabularies are exported by [Search _ NTG Central_files/search-index.js](Search%20_%20NTG%20Central_files/search-index.js). Invalid records and duplicate IDs are skipped; an empty valid index is an error. Navigation only accepts HTTPS, mail and telephone URLs.

Autocomplete and results share one cached JSON request per page load, with no per-keystroke requests or added dependencies. A failed load is evicted from the cache so search can retry. If initial autocomplete loading fails, reload after restoring the data to restore suggestions. Text, query highlighting and record details are built using DOM text APIs, not HTML interpolation. Reload after editing the JSON; keep it valid JSON without comments or trailing commas.

Popular-search labels and links are authored in [Search _ NTG Central.html](Search%20_%20NTG%20Central.html), separately from the index. When changing them, update the `popularSearches` export in [Search _ NTG Central_files/search-index.js](Search%20_%20NTG%20Central_files/search-index.js) as well, so coverage tests check the same queries. Ensure each popular query still matches an indexed record. The tests deliberately assert 120 records and the original first/24th labels; update those expectations only when intentionally changing the dataset contract.

## Validation

Run the built-in Node test suite and syntax checks from the project root:

```bash
npm test
node --check "Search _ NTG Central_files/search-index.js"
node --check "Search _ NTG Central_files/search-results.js"
node --check "Search _ NTG Central_files/search-autocomplete.js"
node --check "Search _ NTG Central_files/header-compact.js"
node --check "Search _ NTG Central_files/global-v2.js"
```

Tests cover normalization, URL query parsing, token/prefix/synonym matching, ranking, grouped filters, disjunctive counts, sorting, pagination boundaries, corrections, safe destinations, record validation, shared loading/retry, all 120 records and every popular query. There is no lint or build script.

For browser checks, use the localhost Vite URL and verify:

1. The header has no breadcrumb above Search; the main field is 812px by 56px when space allows, with a 32px title-to-field gap.
2. Missing/empty/whitespace `searchterm` and unrelated URL parameters show eight Popular searches links without saved results. A populated `searchterm` initializes local results. Popular links work with keyboard activation and opening in a new tab.
3. Empty, whitespace-only and one-character input show no suggestions. `ap` or `Apply f` shows up to six; uppercase matches too. Arrow/Enter and pointer selection fill without submitting; Escape, Tab and outside clicks dismiss.
4. Button/Enter submission stays local. `Apply f` returns multiple pages; type controls, all four sorts, combined category/owner filters, Show all, Clear all and pagination update rows/counts correctly and reset pages as documented.
5. `leavve` offers `leave`; an unmatched query shows No results found. Empty submission restores Popular searches. Markup-like query text stays text. Local record details close with Escape and restore focus.
6. At 320px/390px widths, Popular searches, result text and controls fit without horizontal scrolling; check filter collapse at 900px, the phone header at 768px and compact search at 1296px.
7. Confirm one shared JSON request on reload. Block it: Popular searches remains available, submissions show the local error, and Try again recovers after unblocking it. Check rapid submissions cannot render stale results.
8. Check the header at 320, 390, 768, 769, 1024, 1295, 1296 and 1440px, then immediately either side of its measured fit threshold. There must be only one `#mainmenu`, no standalone white navigation row, and no wrapping or overlap between inline navigation, logo, search and avatar. When navigation cannot fit, the hamburger must be available instead.
9. Expand and close compact search near the fit threshold; verify stable transitions between inline navigation and the mobile menu. Resize in both directions with menus open, and check submenu Back, Enter/Space on the menu button, Escape, outside clicks, focus restoration and `aria-expanded`. Repeat after fonts load or browser zoom changes. Existing Node tests do not cover header layout; these checks require a browser.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| Search is temporarily unavailable | Check the local JSON request for an HTTP error, invalid JSON or an index with no valid records. Restore the data, then select Try again. |
| Results load after retry but suggestions remain absent | Reload the page. Autocomplete initializes its own suggestions once, even though the loader cache is shared. |
| A result disappears after editing the index | Check required fields, duplicate IDs, exact type/category names and calendar dates. Run `npm test` to validate the shipped dataset. |
| Icons are missing | Use `localhost`, confirm network access and check the Font Awesome kit request for a 403 response. |
| Refresh restores a previous search | The current address, not in-memory search/filter state, determines initialization. Update `searchterm` explicitly to change the reload query. |

### Known Limitations

The saved page still references remote NTG fonts, icons, analytics, and APIs. CORS restrictions, network failures, or unavailable snapshot endpoints can cause missing assets and console errors independently of local search. The localhost Font Awesome restriction described above still applies.

The local search UI requires JavaScript. If its module does not initialize, the saved main form's native action still points to the live NTG search endpoint and may leave the prototype. Popular searches markup is static, but running those queries requires the controller.

This is an in-browser demonstration, not a production Funnelback integration: there is no crawler, remote index, authentication, access-control filtering, server-side search or generative AI. Matching normalizes text to ASCII letters and digits, so multilingual search is not implemented. All synthetic records, contacts and service-support addresses are demonstration data, not authoritative content or operational support channels.

## Source Files

- [Search _ NTG Central.html](Search%20_%20NTG%20Central.html): page, header search form, and accessible autocomplete markup
- [Search _ NTG Central_files/header-compact.css](Search%20_%20NTG%20Central_files/header-compact.css): compact header, main search field, and suggestions styling
- [Search _ NTG Central_files/header-compact.js](Search%20_%20NTG%20Central_files/header-compact.js): utility dropdown, responsive search, fit-based main-menu placement and mobile submenu Back controls
- [Search _ NTG Central_files/search-autocomplete.js](Search%20_%20NTG%20Central_files/search-autocomplete.js): matching and accessible autocomplete interaction
- [Search _ NTG Central_files/search-suggestions.json](Search%20_%20NTG%20Central_files/search-suggestions.json): shared 120-record synthetic index
- [Search _ NTG Central_files/search-index.js](Search%20_%20NTG%20Central_files/search-index.js): cached loading, validation and pure search model
- [Search _ NTG Central_files/search-results.js](Search%20_%20NTG%20Central_files/search-results.js): query routing, result rendering, filters and local details
- [Search _ NTG Central_files/search-results.css](Search%20_%20NTG%20Central_files/search-results.css): scoped Popular searches and responsive result layouts
- [Search _ NTG Central_files/search-index.test.js](Search%20_%20NTG%20Central_files/search-index.test.js): Node regression suite
- [Search _ NTG Central_files/main.css](Search%20_%20NTG%20Central_files/main.css) and [Search _ NTG Central_files/global-v2.js](Search%20_%20NTG%20Central_files/global-v2.js): existing NTG design system and main-menu interactions

The matching compact-header Squiz template is maintained separately in `C:\Projects\compact-header\src\nester\`. Its export is generated with `npm run build` in that separate repository; this prototype has no build script. Changes here do not automatically update the Squiz template. Validate retained Squiz asset IDs in the NTG Central CMS before importing.
