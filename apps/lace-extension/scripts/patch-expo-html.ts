import * as fs from 'fs';
import * as path from 'path';

// Builds dist/expo/index.html from a static template plus the hashed asset
// URLs Expo emitted, and copies bootstrap.js into dist. The template and
// bootstrap files in `assets/` carry no comments — dist is what end users
// inspect, so the architectural narrative lives here instead.
//
// Background
// ----------
// Chrome's side panel has rendering issues in which the panel stays blank
// while subresources referenced from the initial HTML are still loading
// (see Chromium issue 40915514 and related reports on the
// chromium-extensions group). Popup and full-tab opens are unaffected.
// To keep the side panel responsive, the heavy CSS and JS bundles are
// loaded only after the initial document has fully loaded.
//
// Implementation
// --------------
// `assets/html/index.html` paints the splash from inline HTML+CSS so the
// initial document has no subresources on the critical path. The hashed
// asset URLs travel through a non-executable
// <script type="application/json"> data block; `bootstrap.js` reads them
// and appends the real CSS and JS to the document in a window.load
// listener.
//
// CSP constraints
// ---------------
// MV3 extension_pages CSP (`script-src 'self'`) forbids inline scripts,
// so `bootstrap.js` is loaded as an external file. The asset list is
// passed via a `<script type="application/json">` element, which is not
// executable and therefore not subject to `script-src`.
//
// Maintenance notes
// -----------------
// - In the splash SVG, viewBox="0 0 80 80" matches the path's natural
//   extent. Adding a `<g transform="scale(0.5)">` wrapper renders the
//   logo at half size in the upper-left quadrant and causes the rotation
//   to orbit off-axis.
// - In bootstrap.js, `script.async = false` on dynamically-inserted
//   external scripts forces in-order execution. Removing it makes the
//   three Expo entry bundles race (runtime → common → index ordering
//   breaks).

const distDir = path.join(__dirname, '..', 'dist', 'expo');
const expoHtmlPath = path.join(distDir, 'index.html');
const bootstrapDestPath = path.join(distDir, 'bootstrap.js');
const templatePath = path.join(__dirname, '..', 'assets', 'html', 'index.html');
const bootstrapSourcePath = path.join(
  __dirname,
  '..',
  'assets',
  'js',
  'lace-bootstrap.js',
);

const expoHtml = fs.readFileSync(expoHtmlPath, 'utf8');

const styles = Array.from(
  expoHtml.matchAll(/<link rel="stylesheet" href="([^"]+)"/g),
  match => match[1],
);
const scripts = Array.from(
  expoHtml.matchAll(/<script src="([^"]+)"[^>]*\bdefer\b[^>]*>/g),
  match => match[1],
);

if (styles.length === 0) {
  throw new Error(
    `No <link rel="stylesheet"> tags in ${expoHtmlPath}; Expo's HTML output may have changed shape.`,
  );
}
if (scripts.length === 0) {
  throw new Error(
    `No deferred <script> tags in ${expoHtmlPath}; Expo's HTML output may have changed shape.`,
  );
}

const template = fs.readFileSync(templatePath, 'utf8');
const placeholder = '__LACE_ASSETS_JSON__';
const replacement = JSON.stringify({ styles, scripts });
const output = template.replace(placeholder, () => replacement);

if (output === template) {
  throw new Error(
    `Placeholder '${placeholder}' not found in ${templatePath}; the template is out of sync with this script.`,
  );
}

fs.writeFileSync(expoHtmlPath, output);
fs.copyFileSync(bootstrapSourcePath, bootstrapDestPath);
