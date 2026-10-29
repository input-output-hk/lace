// The published package is Apache-2.0 and carries no third-party licence
// texts, so a bundle may inline only permissively licensed code. The pure parts
// of that check live here so a test can feed them markers and expressions;
// `check-bundled-licences.mjs` applies them to a built distribution.
import fs from 'node:fs';
import path from 'node:path';

export const PERMISSIVE = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'BlueOak-1.0.0',
  'Python-2.0',
]);

// rolldown names every inlined module in a `//#region <path>` marker, the
// path filling the rest of the line (it may contain spaces). The path is
// relative to the output directory and may pass through a workspace package's
// own node_modules, not only the root's; the package is named by the last
// node_modules segment.
const REGION = /^\/\/#region (.+)$/gm;

/**
 * The directories (relative to the output directory) of the packages a built
 * file inlines, keyed by directory so two installed copies of one name are
 * two entries.
 */
export const inlinedPackageDirectories = code => {
  const directories = new Map();
  for (const [, region] of code.matchAll(REGION)) {
    const segments = region.trim().split('/');
    const index = segments.lastIndexOf('node_modules');
    if (index < 0) continue; // first-party source
    const scoped = segments[index + 1]?.startsWith('@');
    const end = index + (scoped ? 3 : 2);
    if (segments.length < end) continue;
    const directory = segments.slice(0, end).join('/');
    directories.set(directory, segments.slice(index + 1, end).join('/'));
  }
  return directories;
};

// The SPDX licence identifiers the guard recognises as not permissive (the
// copyleft and share-alike families npm packages declare, with the
// deprecated spellings still in use). An identifier in neither set is not one
// the guard knows and refuses the expression, so a misspelling never passes
// as a licence: add the identifier to the set it belongs to.
const NOT_PERMISSIVE = new Set([
  'AGPL-1.0',
  'AGPL-1.0-only',
  'AGPL-1.0-or-later',
  'AGPL-3.0',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'Artistic-1.0',
  'Artistic-1.0-Perl',
  'Artistic-2.0',
  'BUSL-1.1',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'CC-BY-NC-4.0',
  'CC-BY-NC-SA-4.0',
  'CC-BY-ND-4.0',
  'CC-BY-SA-3.0',
  'CC-BY-SA-4.0',
  'CDDL-1.0',
  'CDDL-1.1',
  'CPAL-1.0',
  'CPL-1.0',
  'EPL-1.0',
  'EPL-2.0',
  'EUPL-1.1',
  'EUPL-1.2',
  'GFDL-1.3-only',
  'GFDL-1.3-or-later',
  'GPL-1.0',
  'GPL-1.0-only',
  'GPL-1.0-or-later',
  'GPL-2.0',
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-3.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'LGPL-2.0',
  'LGPL-2.0-only',
  'LGPL-2.0-or-later',
  'LGPL-2.1',
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'LGPLLR',
  'MPL-1.0',
  'MPL-1.1',
  'MPL-2.0',
  'MPL-2.0-no-copyleft-exception',
  'MS-RL',
  'OFL-1.0',
  'OFL-1.1',
  'OSL-1.0',
  'OSL-2.0',
  'OSL-2.1',
  'OSL-3.0',
  'QPL-1.0',
  'RPL-1.1',
  'RPL-1.5',
  'SSPL-1.0',
  'Sleepycat',
]);

// The SPDX exception identifiers a bundled package may attach with `WITH`.
// Any other word after WITH is not an exception and refuses the expression.
const EXCEPTIONS = new Set([
  '389-exception',
  'Autoconf-exception-2.0',
  'Autoconf-exception-3.0',
  'Autoconf-exception-generic',
  'Autoconf-exception-macro',
  'Bison-exception-2.2',
  'Bootloader-exception',
  'Classpath-exception-2.0',
  'CLISP-exception-2.0',
  'DigiRule-FOSS-exception',
  'eCos-exception-2.0',
  'Fawkes-Runtime-exception',
  'FLTK-exception',
  'Font-exception-2.0',
  'freertos-exception-2.0',
  'GCC-exception-2.0',
  'GCC-exception-3.1',
  'gnu-javamail-exception',
  'GPL-3.0-interface-exception',
  'GPL-3.0-linking-exception',
  'GPL-3.0-linking-source-exception',
  'GPL-CC-1.0',
  'i2p-gpl-java-exception',
  'KiCad-libraries-exception',
  'LGPL-3.0-linking-exception',
  'Libtool-exception',
  'Linux-syscall-note',
  'LLVM-exception',
  'LZMA-exception',
  'mif-exception',
  'Nokia-Qt-exception-1.1',
  'OCaml-LGPL-linking-exception',
  'OCCT-exception-1.0',
  'OpenJDK-assembly-exception-1.0',
  'openvpn-openssl-exception',
  'PS-or-PDF-font-exception-20170817',
  'Qt-GPL-exception-1.0',
  'Qt-LGPL-exception-1.1',
  'Qwt-exception-1.0',
  'SHL-2.0',
  'SHL-2.1',
  'Swift-exception',
  'u-boot-exception-2.0',
  'Universal-FOSS-exception-1.0',
  'WxWindows-exception-3.1',
  'x11vnc-openssl-exception',
]);

// A strict reading of an SPDX expression: known identifiers (letters, digits,
// "." and "-", with an optional trailing "+") joined by AND and OR, grouped
// by parentheses, a bare identifier optionally followed by WITH and a listed
// exception. Any other character, and anything else, is refused rather than
// guessed at.
const TOKEN = /\s+|\(|\)|[A-Za-z0-9.-]+\+?/y;
const KEYWORDS = new Set(['AND', 'OR', 'WITH']);

const tokenize = expression => {
  const tokens = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < expression.length) {
    const at = TOKEN.lastIndex;
    const match = TOKEN.exec(expression);
    if (match === null)
      throw new Error(`unexpected character at ${at}: ${expression[at]}`);
    if (match[0].trim() !== '') tokens.push(match[0]);
  }
  return tokens;
};

const parse = tokens => {
  let position = 0;
  const peek = () => tokens[position];
  const next = () => tokens[position++];
  const atom = () => {
    const token = next();
    if (token === '(') {
      const inner = or();
      if (next() !== ')') throw new Error('unbalanced parentheses');
      return inner;
    }
    if (token === undefined || token === ')' || KEYWORDS.has(token))
      throw new Error(`unexpected ${token ?? 'end'}`);
    // "GPL-3.0-or-later" style suffixes and a trailing "+" name the same base
    // licence family; an exception clause ("WITH ...") keeps the base licence.
    const base = token.replace(/\+$/, '');
    if (peek() === 'WITH') {
      next();
      const exception = next();
      if (!EXCEPTIONS.has(exception))
        throw new Error(`not an exception: ${exception ?? 'end'}`);
    }
    if (PERMISSIVE.has(base)) return true;
    if (NOT_PERMISSIVE.has(base)) return false;
    throw new Error(`not a licence identifier the guard knows: ${token}`);
  };
  const and = () => {
    let value = atom();
    while (peek() === 'AND') {
      next();
      value = atom() && value;
    }
    return value;
  };
  const or = () => {
    let value = and();
    while (peek() === 'OR') {
      next();
      value = and() || value;
    }
    return value;
  };
  const result = or();
  if (position !== tokens.length) throw new Error('trailing tokens');
  return result;
};

/**
 * Whether an SPDX licence expression allows use under a permissive licence:
 * every identifier of some OR alternative is permissive. Anything that is not
 * a valid expression over identifiers the guard knows, with only listed
 * exceptions after WITH, is not permissive.
 */
export const isPermissive = expression => {
  if (typeof expression !== 'string' || expression.trim() === '') return false;
  try {
    return parse(tokenize(expression));
  } catch {
    return false;
  }
};

/** The licence expression a manifest declares, or undefined. */
export const licenceOf = manifest =>
  typeof manifest.license === 'string'
    ? manifest.license
    : typeof manifest.license?.type === 'string'
    ? manifest.license.type
    : undefined;

/**
 * The packages a distribution inlines that are not permissively licensed,
 * each as "name@version: licence (in files)". `root` is the directory the
 * markers' paths are relative to (the distribution directory).
 */
export const licenceViolations = (distributionDirectory, root) => {
  const inlined = new Map(); // directory -> { name, files }
  for (const file of fs
    .readdirSync(distributionDirectory)
    .filter(f => /\.[cm]?js$/.test(f))) {
    const code = fs.readFileSync(
      path.join(distributionDirectory, file),
      'utf8',
    );
    for (const [directory, name] of inlinedPackageDirectories(code)) {
      if (!inlined.has(directory)) inlined.set(directory, { name, files: [] });
      inlined.get(directory).files.push(file);
    }
  }
  const violations = [];
  for (const [directory, { name, files }] of inlined) {
    const manifestPath = path.resolve(root, directory, 'package.json');
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      violations.push(`${name}: no manifest at ${manifestPath}`);
      continue;
    }
    const licence = licenceOf(manifest);
    if (!isPermissive(licence)) {
      violations.push(
        `${name}@${manifest.version}: ${
          licence ?? 'no license field'
        } (in ${files.join(', ')})`,
      );
    }
  }
  return { count: inlined.size, violations };
};
