# NTG Central Search Prototype

Static NTG Central search-page snapshot served locally with Vite. The header adapts the compact-header structure while retaining the existing NTG design-system assets, search/profile content, and branding colors.

## Run

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Vite opens `Search _ NTG Central.html` at `http://localhost:5173/`.

The supplied Font Awesome kit is authorized for `localhost`; `127.0.0.1` returns HTTP 403 and prevents icons from loading. Keep the browser on the `localhost` URL.

## Header

The utility row contains NTG Directory, NTG Policy Library, MyHR, MyForms, Noticeboard, and Online systems. MyForms points to `https://myforms.nt.gov.au/`; Online systems links to `https://ntgcentral.nt.gov.au/online-systems`.

The main menu starts with My job; the Home item has been removed. Its final Online systems item opens `https://nt.gov.au/` in a new tab. This is separate from the utility-row Online systems link.

The main header spans the viewport without a maximum-width cap, with 32px desktop edge padding and 16px mobile edge padding. Its 72px navy band (`#102040`) contains a white logo and bold Roboto navigation, a 294px by 40px white search pill, and a 40px green (`#208820`) avatar showing the current user's initial. Desktop profile controls show the avatar only; profile data and navigation destinations are unchanged.

Font Awesome is loaded from kit `https://kit.fontawesome.com/41b791824a.js` with `crossorigin="anonymous"`, replacing the local icon stylesheet. The kit provides compatibility styles for the snapshot's legacy `fas`/`fal` classes and CSS pseudo-element icons. It requires network access and `localhost` authorization. A 403 response from the kit prevents icons from rendering; check kit availability and allowed domains in Font Awesome. No additional npm dependency is needed.

At viewport widths of 1296px and above, the existing main menu is placed beside the logo, search, and profile controls. Its original-position wrapper collapses while the menu is inline so it does not leave a strip below the header. Below 1296px the menu returns to that wrapper; at 768px and below the existing mobile menu and mobile search controls are used. The JavaScript placement breakpoint and CSS breakpoint must remain synchronized. The utility dropdown closes on outside click and Escape and keeps its `aria-expanded` state synchronized.

## Source Files

- `Search _ NTG Central.html`: page and header markup
- `Search _ NTG Central_files/header-compact.css`: compact header styling
- `Search _ NTG Central_files/header-compact.js`: utility dropdown and responsive main-menu placement
- `Search _ NTG Central_files/main.css` and `global-v2.js`: existing NTG design system and main-menu interactions

The matching Squiz template is maintained separately in `C:\Projects\compact-header\src\nester\`. Its export is generated with `npm run build`; validate retained Squiz asset IDs in the NTG Central CMS before importing.
