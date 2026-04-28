/**
 * React 19 dropped UMD builds, but @redux-devtools/cli expects to serve
 * react.production.min.js and react-dom.production.min.js from each
 * package's umd/ directory via express.static. Without them the server
 * falls back to serving index.html for every JS request, breaking the page.
 *
 * This script uses esbuild to create browser-compatible IIFE bundles that
 * expose window.React and window.ReactDOM, placing them where the CLI expects.
 * Both globals are created from a single bundle so they share the same React
 * instance (required for createRoot / createElement compatibility).
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';

const reactPkgDir = path.dirname(require.resolve('react/package.json'));
const reactDomPkgDir = path.dirname(require.resolve('react-dom/package.json'));

const reactUmdDir = path.join(reactPkgDir, 'umd');
const reactDomUmdDir = path.join(reactDomPkgDir, 'umd');

mkdirSync(reactUmdDir, { recursive: true });
mkdirSync(reactDomUmdDir, { recursive: true });

console.log(
  '[redux-devtools] Generating React UMD bundles for Redux DevTools...',
);

// Bundle React + ReactDOM/client together so both globals share the same
// React instance. The HTML page loads react.production.min.js first.
void build({
  stdin: {
    contents: [
      "import React from 'react';",
      "import * as ReactDOMClient from 'react-dom/client';",
      'globalThis.React = React;',
      'globalThis.ReactDOM = ReactDOMClient;',
    ].join('\n'),
    resolveDir: path.join(__dirname, '../../..'),
  },
  bundle: true,
  minify: true,
  format: 'iife',
  outfile: path.join(reactUmdDir, 'react.production.min.js'),
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
}).then(() => {
  // Stub — ReactDOM is already exposed via react.production.min.js above.
  writeFileSync(
    path.join(reactDomUmdDir, 'react-dom.production.min.js'),
    '/* ReactDOM already loaded via react.production.min.js */\n',
  );
  console.log('[redux-devtools] Done.');
});
