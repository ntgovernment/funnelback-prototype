# NTG Central Search Prototype

Static NTG Central search-page snapshot served locally with Vite. The header adapts the compact-header structure while retaining the existing NTG design-system assets, search/profile content, and branding colors.

## Run

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Vite opens `Search _ NTG Central.html` at `http://127.0.0.1:5173/`.

## Header

The utility row contains NTG Directory, NTG Policy Library, MyHR, MyForms, Noticeboard, and Online systems. MyForms points to `https://myforms.nt.gov.au/`; Online systems links to `https://ntgcentral.nt.gov.au/online-systems`.

The palette comes from the existing NTG design system, including primary navy `#102040` and its established blue/green accents. Font Awesome and design-system styles are loaded from local page assets; no additional npm dependency is needed for the header.

At wide desktop widths, the existing main menu is placed beside the logo, search, and profile controls. At narrower widths it returns to its original location so the page's existing mobile menu behavior remains in control. The utility dropdown closes on outside click and Escape and keeps its `aria-expanded` state synchronized.

## Source Files

- `Search _ NTG Central.html`: page and header markup
- `Search _ NTG Central_files/header-compact.css`: compact header styling
- `Search _ NTG Central_files/header-compact.js`: utility dropdown and responsive main-menu placement
- `Search _ NTG Central_files/main.css` and `global-v2.js`: existing NTG design system and main-menu interactions

The matching Squiz template is maintained separately in `C:\Projects\compact-header\src\nester\`. Its export is generated with `npm run build`; validate retained Squiz asset IDs in the NTG Central CMS before importing.