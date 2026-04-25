# ANDROMEDA optimized build

Production entry point: `index.html`.

What changed without changing app behavior:
- CSS is served from `assets/dist/styles.min.css`.
- All app JS modules are bundled into `assets/dist/app.bundle.min.js` to reduce HTTP requests.
- Original readable source files are still kept in `assets/js/` and `assets/css/styles.css`.
- Added `sw.js` for static caching on GitHub Pages.
- Added preconnect hints for Google Fonts and jsDelivr.

Deploy the whole folder contents to GitHub Pages root.
