# NTG Central Search Prototype

Interactive NTG Central search prototype with a shared 1,116-record index: 120 curated records and 996 imported records. Autocomplete, filtering, sorting and pagination run entirely in the browser; no search backend or AI service is required. The tracked HTML and index have been mechanically sanitized for public testing.

## Public Deployment

Tester URL: https://ntgovernment.github.io/funnelback-prototype/

Source and documentation belong on `main`. The `gh-pages` branch contains only the generated site, including its root `index.html`, original named entry, local assets and `.nojekyll`. Initial publication commit: `03d3a2f`. GitHub Pages is configured to deploy from `gh-pages`, folder `/`. The latest HTTP check returned 404; confirm a successful Pages deployment before distributing this URL to participants.

Build and validate a release from the source checkout:

```bash
npm ci
npm test
npm run test:public
npm run build
npm run check:public
```

`dist/` is the allowlisted public artifact, not a source checkout. It excludes the raw snapshot, tests, legacy profile scripts and analytics. The build strips real contact fields and private provenance, replaces contact addresses with `example.org`, and removes URL queries and fragments. It preserves approved live destinations, which may require NTG access. Automated sanitization does not certify free text or erase sensitive content from Git history; review content, assets and repository exposure before each release. Do not commit credentials or raw exports.

For branch publishing, copy only the validated contents of `dist/` into a separate checkout of `gh-pages`, preserving that checkout's `.git` metadata. Remove obsolete published files, review the diff, commit and push `gh-pages`. Do not copy source files or `node_modules`, and do not rebuild inside a deployment checkout: the build replaces `dist/`. Pushing source changes to `main` alone does not update the site.

The optional [Actions workflow](.github/workflows/deploy-pages.yml) uses a different publishing mode: GitHub Actions artifacts. To use it instead, change Settings > Pages > Source to GitHub Actions, then manually run the workflow on `main` with `publish` enabled and a review reference. It runs search, public-artifact and Chromium checks before deployment. Do not switch hosting modes merely to update documentation.

Preview the production artifact at its repository subpath:

```bash
npm run preview:public
```

Open http://127.0.0.1:4175/funnelback-prototype/. For automated browser checks, install Chromium with `npx playwright install chromium`, then run `npm run test:browser`; Playwright starts or reuses this preview server. The kit must allow the preview hostname for those checks. After publishing, verify the root URL, `?searchterm=Apply%20for%20leave`, refresh, JSON/module responses, icons, keyboard interaction and mobile filters without an NTG login. A 404 requires checking the repository's Pages settings and deployment run; a pushed branch alone does not prove the site is available.

## Workshop Testing

Participants open the tester URL in a separate tab and return to the Optimal Workshop study to report completion and feedback. Confirm the URL is live and pilot on desktop and mobile before inviting testers. No Optimal Workshop SDK, recording, analytics or automatic task-success tracking is included.

| Task | Observable success |
| --- | --- |
| Find guidance for applying for leave using search suggestions. | Select a relevant suggestion, submit and identify a relevant result. |
| Narrow an `apply` search by result type, category and owner, then reset. | Results and counts change; clearing filters retains the query. |
| Recover from `leavve`. | Use the offered `leave` correction and identify a relevant result. |
| Find the Switchboard contact. | Identify the contact result; its address is demo data, not an operational contact. |
| On mobile, change sort in Filter and sort, cancel, then apply it. | Cancel preserves the previous sort; Show results applies the draft. |
| Inspect a demonstration record with no external destination. | Open its local detail dialog, close with Escape and recover focus. |

Record completion, confidence and comments in the study. Do not ask participants to email or call demonstration contacts. Live links can leave the prototype; decide in advance whether following them is part of a task. In-place searches and filters do not update the URL, so URL observation alone cannot establish task success. Start each task from the root URL or an explicit `searchterm` link.

## GitHub Pages Icons

The public build (`npm run build`) loads Font Awesome kit `https://kit.fontawesome.com/9bf658a5c7.js` with `crossorigin="anonymous"`. It does not ship the local Free icon bundle or force Light icons to Solid. The public security policy permits Font Awesome scripts, styles, fonts and network requests; other external scripts remain blocked.

Authorize `ntgovernment.github.io`, `localhost` and the preview host `127.0.0.1` in the kit's allowed domains, and enable the required Pro Light icons, legacy-class compatibility and CSS pseudo-element support. Icons require network access. Local development uses the same Pro kit as the Pages build. Numeric SVG geometry is preserved during contact redaction; screen-reader-only labels remain accessible without overlapping icon buttons.

## Run

Requirements: npm and Node.js matching Vite 7's supported range: `^20.19.0 || >=22.12.0`.

```bash
npm install
npm run dev
```

Vite opens [Search _ NTG Central.html](Search%20_%20NTG%20Central.html) at `http://localhost:5173/`. If that port is occupied, use the next available port printed by Vite, such as `http://localhost:5174/`. Serve the page through Vite rather than opening it directly from disk: autocomplete uses a JavaScript module and fetches a local JSON file.

Use `localhost` for the development URL. A 403 from the kit or its font requests requires checking the kit's allowed domains and license; the public and preview hosts require their own authorization.

### Demo Walkthrough

1. Open the URL printed by Vite without a `searchterm` parameter to see Popular searches.
2. Type `Apply f` in the main search field. Select a suggestion to fill the field, then submit with Enter or the Search button.
3. Change the content type, select categories or content owners, and try the sort options. Use Next to explore additional pages when enough records match.
4. Search for `leavve` to see zero-result closest-match suggestions. Select one to run that related search, then select a result without an external destination to inspect its local demonstration record.
5. Clear the main field and submit to return to Popular searches.

The large main search field uses the local index. Header navigation and supplied external result links can lead to live sites that require network or NTG access. The compact form has a local fallback action but no autocomplete; use the main field for study tasks.

## Header

The desktop utility row contains NTG Directory, NTG Policy Library, MyHR, MyForms, Noticeboard, and Online systems. At mobile widths (768px and below), that row is hidden and its links appear under the first hamburger-menu item, Quick links, above My job. MyForms points to `https://myforms.nt.gov.au/`; Online systems links to `https://ntgcentral.nt.gov.au/online-systems`.

The desktop main menu starts with My job; the Home item has been removed. Its final Online systems item opens `https://nt.gov.au/` in a new tab. This is separate from the utility-row Online systems link.

The main header bands span the viewport while the Quick links and main-header contents are centered and capped at 1232px. A 1px `#384560` divider sits below the desktop Quick links row. The header uses 32px desktop edge padding and 16px mobile edge padding. Its 72px navy band (`#102040`) contains a white logo, bold Roboto navigation and a 294px by 40px white search pill. The public prototype removes personalized profile controls and requests.

Font Awesome is loaded from kit `https://kit.fontawesome.com/9bf658a5c7.js` with `crossorigin="anonymous"`. The kit provides Pro Light icons and compatibility for legacy `fas`/`fal` classes and CSS pseudo-elements. It requires network access and authorization for the current hostname. The public build does not include the local Free icon bundle or override Light icons with Solid fonts.

The main menu stays beside the logo and search whenever the complete header row fits. It never moves into a separate white navigation row. JavaScript measures the intrinsic navigation width and available header space, checking again on resize, font loading and search expansion. When the items no longer fit, the inline navigation is replaced by a hamburger button that opens the same menu in a panel below the header. The fit threshold depends on available space and rendered content, not a fixed desktop breakpoint. At 768px and below, the mobile menu is always used. Personalized avatars are not included.

The mobile panel includes Back controls for returning from submenus. The menu button supports Enter and Space, exposes `aria-controls` and `aria-expanded`, and closes on Escape or outside clicks. Switching between inline and mobile layouts closes open navigation and resets submenu state. Focus moves to visible controls when needed. The utility dropdown also closes on outside click and Escape and keeps its `aria-expanded` state synchronized.

The compact search independently collapses to an icon below 1296px; the icon is white while shown alone. Activating it expands the search field to the left while keeping the icon fixed, where it returns to the dark color on the white field. Search expansion can switch the main navigation to mobile mode if space becomes insufficient. This also applies to phones, where search retains its existing overlay behavior and the avatar stays hidden. Escape and outside clicks close the expanded search.

## Search Autocomplete

The NTG Central breadcrumb above Search has been removed; the logo and navigation branding remain. The main search form now sits inside the header beneath the white Roboto bold Search heading (48px font size and line height), with a 32px gap between the main navigation band and the heading. A 32px gap separates the title from the white search field, which is 56px high and at most 812px wide, shrinking to fit smaller screens. The input uses 16px text, 24px line height, 16px left padding, and a right-aligned search button. The compact navigation search is unchanged and does not use autocomplete.

Suggestions appear when the focused field contains at least two characters after trimming leading and trailing whitespace. Matching is case-insensitive and includes substrings, with prefix matches first and original dataset order retained within each group. Up to six matches are shown. Clearing the field, dropping below the threshold, or entering a query with no matches hides the dropdown.

Arrow keys move through suggestions; selecting with Enter or a pointer fills the field without submitting. Enter without a selected suggestion or the Search button runs local search without navigation. Escape, Tab, and outside clicks dismiss suggestions.

The field exposes combobox/listbox roles, its expanded state and active option, and a screen-reader status announcement. Keyboard navigation keeps focus in the input; Tab moves focus normally. Suggestions are rendered as text, not HTML.

The main form is intercepted by the local results controller. Straight and curly apostrophes are removed consistently with the saved page's normalization. Both forms have local fallback actions; compact search is separate from the main autocomplete. There is no Funnelback server or AI integration.

## Popular Searches And Local Results

The first-load body shows Popular searches when `searchterm` is missing, empty or whitespace-only. Unrelated parameters do not change this view. The eight links use the supplied three-column layout, stacking on mobile. Their labels and order are My performance, Emergency contacts, myHR; Apply for leave, Job vacancies, NTG Pay; NTG Online Sytems, The latest news. The supplied spelling of `Sytems` is retained.

Popular-search links run local searches on ordinary clicks and have encoded same-page URLs for opening in another tab. A URL such as `http://localhost:5174/Search%20_%20NTG%20Central.html?searchterm=Apply%20for%20leave` prefills the main field and initializes results. Empty submissions return to Popular searches. In-place interactions do not change browser history or rewrite the URL.

The URL is read only at startup. Refreshing restores its original query, not subsequent in-place searches or filters; browser Back does not undo those interactions. To share a query, set the `searchterm` parameter explicitly. Queries that normalize to no searchable letters or digits also show Popular searches.

Results replace the main content region while retaining the header and footer. Legacy saved results and embedded snapshot scripts have been removed. Result types are All results, Information, Policy, Contact, Online system, Enterprise service, Agency, News and Event/Training. Their controls use Font Awesome Pro Light (`fal`) icons; other local search icons retain their existing Solid (`fas`) styling. The AI panel is intentionally omitted.

Contact results show their approved title, content owner and a synthetic email address. Real roles, locations, phone numbers and extensions are stripped from the public dataset. Contact results omit breadcrumbs, dates, excerpts and location. Demo contact addresses remain actionable but are not operational support channels; they are marked as demo data in the index. On narrow screens, contact details stack vertically.

Search matches all query words across titles, descriptions, keywords, owners, categories and contact metadata. The final word can be a prefix. Matching ignores case and punctuation, recognizes application/apply variants, and ranks exact titles and title prefixes first. The results heading includes the visible result range. “Did you mean?” suggestions appear above it when useful candidates are available, including for searches with results. Zero-result searches use spelling corrections when available; otherwise, a closest indexed title is suggested only when at least half of the meaningful query terms match closely. Suggestions are clickable and start a normal search; queries are never silently corrected, and unrelated queries do not receive arbitrary suggestions.

- Categories and owners use OR within each group, AND across groups and the selected result type.
- Type counts respect the query and category/owner selections but ignore the active type. Each facet's counts respect the other groups while ignoring its own selections.
- Sort options are relevance, newest update, A-Z and Z-A. Undated records sort last by update date.
- Ten results appear per page. Query, type, sort and filter changes reset to page one. Clear all filters retains the query and resets type, facets, sorting and page.
- Show all expands categories. Sort uses 24px navy radio buttons; categories and owners use 24px navy checkboxes. Selected radios show a white center dot, and checked boxes show a white tick. Content-owner options have 64px-high rows, support multiple selections, close on Escape or outside clicks, and restore keyboard focus.
- Below 900px, a full-width result-type dropdown replaces the type buttons. Filter and sort opens a modal panel beneath the navy header, with scrollable options and fixed Show N results/Clear all filters actions. Sort and facet edits update a preview count but only apply when Show results is selected. Close or Escape discards edits, including draft clears; Escape first closes an open content-owner dropdown. Applying resets pagination. Type-dropdown changes apply immediately. Desktop filters still apply immediately. Popular searches stacks below 769px.
- Mobile results use the pale-grey page background (`#ecf0f0`) with white dropdown, filter-trigger and result surfaces. The dropdown is 52px high; result rows have 24px padding. The filter trigger uses the existing Font Awesome Pro Light vertical sliders icon (`fal fa-sliders-up`), with matching light chevrons on the trigger and dropdown. The dropdown remains a native labelled select; its decorative chevron does not intercept pointer events.
- The mobile filter panel keeps keyboard focus inside while open, locks background scrolling, and restores focus and scroll position when closed. Each opening starts at the top; draft edits preserve the panel's scroll position. Submitting a new search or resizing to desktop closes the panel and discards unapplied selections.

Real, supplied external destinations open in a new tab. Records without a destination open an accessible local detail dialog rather than an invented live URL. Contact addresses use `example.org` and are not real staff details. Loading failures show a local Try again action; Popular searches does not require the index to load.

### Editing The Index

[Search _ NTG Central_files/search-suggestions.json](Search%20_%20NTG%20Central_files/search-suggestions.json) contains 120 curated records followed by 996 sanitized imported records. The original curated records stay first, and the original 24 IDs/labels remain unchanged. The private Funnelback snapshot, `top1000.json`, is ignored and is not required to run, test or build a clean checkout. This local data is illustrative and is not a live or authoritative search index.

Only maintainers with an approved private snapshot should regenerate the merged index. Regeneration can reintroduce real source contact details; sanitize the tracked files immediately afterwards, review the changes and rerun validation before committing:

```bash
npm run generate:search-index
node scripts/build-public.js --sanitize-source
```

The generator reads the response's `results` array (not `totalCount`), preserves the curated records, replaces previously generated `fb-` records, and prints an audit report. It maps source titles, safe HTTPS destinations, excerpts, thesaurus/concept terms, readable asset lineage, agency owners, and valid `dctermsmodified` values. Type and category are inferred from source metadata; records without a confident category use `General information`. The existing result-type controls keep their current design and count the imported records. Directory pages listed under online systems remain systems; only clearly contact-focused source pages are classified as Contact.

Content owner names follow the official [NT Government agencies directory](https://nt.gov.au/about-government/government-agencies). Department entries use the agency name without the trailing “Department of” wording. The generator maps recognized source sections and exact agency titles to those names; content shared across government or without a specific source mapping falls back to **Chief Minister and Cabinet**. Funnelback does not provide an authoritative owner field, so these assignments are inferred and should be verified before being treated as official ownership.

Dates without a valid content-modified timestamp use a deterministic demo date. The generator can preserve real contact details from source excerpts; the public sanitizer removes them from fields and redacts contact patterns in text. Public contact and service addresses use the reserved `example.org` domain and are marked as demo data. The generator does not invent names, roles, phone numbers or office locations. `sysdate` and `sysindexeddate` are indexing timestamps and are not used as content-update dates.

```json
[
	{
		"id": "apply-leave",
		"label": "Apply for leave",
		"type": "Information",
		"description": "Find the leave application process and approval steps.",
		"categories": ["Employment types"],
		"owner": "Corporate and Digital Development",
		"updated": "2026-09-14",
		"breadcrumbs": ["My job", "Leave", "Applications"]
	}
]
```

Required fields are a unique lowercase ASCII `id` (letters, digits and hyphens), nonblank `label`, recognized `type`, `description`, nonempty recognized `categories` array and nonblank `owner`. Optional `updated` dates must be valid `YYYY-MM-DD` calendar dates. Optional fields include `keywords`, `aliases`, `breadcrumbs`, `url`, `role`, `location`, `email`, `phone`, `extension`, `source`, `inferredFields`, and `demoFields`. Aliases are searched by autocomplete and, together with labels and keywords, can contribute to result-page “Did you mean?” suggestions. Source-backed multi-factor authentication records include `MFA`, `2FA`, `2SV`, `multifactor authentication`, `two-factor authentication`, and `two-step verification` variants. Category/type vocabularies are exported by [Search _ NTG Central_files/search-index.js](Search%20_%20NTG%20Central_files/search-index.js). Invalid records and duplicate IDs are skipped; an empty valid index is an error. Navigation only accepts HTTPS, mail and telephone URLs.

Autocomplete and results share one cached JSON request per page load, with no per-keystroke network requests or added dependencies. Suggestions use the same metadata-aware matching and ranking as results, including descriptions and keywords. A failed load is evicted from the cache so search can retry. If initial autocomplete loading fails, reload after restoring the data to restore suggestions. Text, query highlighting and record details are built using DOM text APIs, not HTML interpolation. Reload after editing the JSON; keep it valid JSON without comments or trailing commas.

Popular-search labels and links are authored in [Search _ NTG Central.html](Search%20_%20NTG%20Central.html), separately from the index. When changing them, update the `popularSearches` export in [Search _ NTG Central_files/search-index.js](Search%20_%20NTG%20Central_files/search-index.js) as well, so coverage tests check the same queries. Ensure each popular query still matches an indexed record. Tests assert 1,116 total records, a 120-record curated prefix and the original first/24th labels; update those expectations only when intentionally changing the dataset contract.

## Validation

Run the built-in Node suites, public build checks and syntax checks from the project root. These commands do not require the private snapshot:

```bash
npm test
npm run test:public
npm run build
npm run check:public
node --check scripts/generate-search-index.js
node --check "Search _ NTG Central_files/search-index.js"
node --check "Search _ NTG Central_files/search-results.js"
node --check "Search _ NTG Central_files/search-autocomplete.js"
node --check "Search _ NTG Central_files/header-compact.js"
node --check "Search _ NTG Central_files/global-v2.js"
```

Tests cover normalization, URL query parsing, token/prefix/synonym matching, ranking, grouped filters, disjunctive counts, sorting, pagination boundaries, corrections, related suggestions and closest-match fallback, safe destinations, record validation, shared loading/retry, deterministic conversion using synthetic fixtures, the curated prefix, imported classification and every popular query. Public-build tests additionally cover sanitization, the shared Pro kit and SVG preservation. There is no lint script. Playwright covers entry points, deep links, keyboard autocomplete, dialogs, mobile drafts, layouts and icons; kit access is required.

For browser checks, use the localhost Vite URL and verify:

1. The header has no breadcrumb above Search; the main field is 812px by 56px when space allows, with a 32px title-to-field gap.
2. Missing/empty/whitespace `searchterm` and unrelated URL parameters show eight Popular searches links without saved results. A populated `searchterm` initializes local results. Popular links work with keyboard activation and opening in a new tab.
3. Empty, whitespace-only and one-character input show no suggestions. `ap` or `Apply f` shows up to six; uppercase matches too. Arrow/Enter and pointer selection fill without submitting; Escape, Tab and outside clicks dismiss.
4. Button/Enter submission stays local. `Apply f` returns multiple pages; type controls, all four sorts, combined category/owner filters, Show all, Clear all and pagination update rows/counts correctly and reset pages as documented.
5. A near-miss no-result query offers clickable closest-match suggestions; unrelated queries show No results found without a speculative suggestion. Empty submission restores Popular searches. Markup-like query text stays text. Local record details close with Escape and restore focus.
6. At 320px/390px widths, Popular searches, result text and controls fit without horizontal scrolling. Search for `Switchboard` and verify the contact result has no breadcrumb, date, excerpt or location, with its contact details stacked on narrow screens. Below 900px, verify the type dropdown and Filter and sort panel: edits leave applied results unchanged until Show results; Close/Escape discards edits; draft Clear can be cancelled; the count includes zero matches; owner options remain reachable above the fixed actions. Check focus trapping/restoration, short landscape scrolling, and resizing to desktop while editing (drafts are discarded). At 900px, verify desktop type buttons and immediately applied sidebar filters return. Check the phone header at 768px and compact search at 1296px.
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

The public page uses local Roboto files and a remote Font Awesome Pro kit. Icons need network access and an authorized hostname. The build excludes snapshot analytics, profile integrations and legacy scripts; those unused legacy files may still exist in the source tree. Approved navigation links can lead to live NTG destinations outside the prototype.

The local search UI requires JavaScript. Both forms have local native actions, but results and suggestions require the controller to initialize. Popular searches markup is static, but running those queries requires JavaScript.

This is an in-browser demonstration, not a production Funnelback integration: there is no crawler, remote index, authentication, access-control filtering, server-side search or generative AI. Matching normalizes text to ASCII letters and digits, so multilingual search is not implemented. All synthetic records, contacts and service-support addresses are demonstration data, not authoritative content or operational support channels.

## Source Files

- [Search _ NTG Central.html](Search%20_%20NTG%20Central.html): page, header search form, and accessible autocomplete markup
- [Search _ NTG Central_files/header-compact.css](Search%20_%20NTG%20Central_files/header-compact.css): compact header, main search field, and suggestions styling
- [Search _ NTG Central_files/header-compact.js](Search%20_%20NTG%20Central_files/header-compact.js): utility dropdown, responsive search, fit-based main-menu placement and mobile submenu Back controls
- [Search _ NTG Central_files/search-autocomplete.js](Search%20_%20NTG%20Central_files/search-autocomplete.js): matching and accessible autocomplete interaction
- [Search _ NTG Central_files/search-suggestions.json](Search%20_%20NTG%20Central_files/search-suggestions.json): shared 1,116-record sanitized index
- [Search _ NTG Central_files/search-index.js](Search%20_%20NTG%20Central_files/search-index.js): cached loading, validation and pure search model
- [Search _ NTG Central_files/search-results.js](Search%20_%20NTG%20Central_files/search-results.js): query routing, result rendering, filters and local details
- [Search _ NTG Central_files/search-results.css](Search%20_%20NTG%20Central_files/search-results.css): scoped Popular searches, responsive result layouts, and filter-control styling
- [Search _ NTG Central_files/search-index.test.js](Search%20_%20NTG%20Central_files/search-index.test.js): Node regression suite
- [Search _ NTG Central_files/main.css](Search%20_%20NTG%20Central_files/main.css): existing NTG design-system styles
- [Search _ NTG Central_files/public-header.js](Search%20_%20NTG%20Central_files/public-header.js): profile-free public navigation and footer interactions
- [Search _ NTG Central_files/public-icons.css](Search%20_%20NTG%20Central_files/public-icons.css): accessible icon-button labels and hidden profile controls
- [scripts/build-public.js](scripts/build-public.js) and [scripts/check-public.js](scripts/check-public.js): static artifact generation and release checks
- [scripts/preview-public.js](scripts/preview-public.js): repository-subpath preview server
- [tests/public-site.spec.js](tests/public-site.spec.js): Chromium interaction and layout checks

The matching compact-header Squiz template is maintained separately in `C:\Projects\compact-header\src\nester\`. Its export is generated in that separate repository. This prototype's `npm run build` produces only the public static site; it does not export a Squiz template. Changes here do not automatically update the template.
