// Fixture-driven harness for scripts/fix-true-sheet-stacked-outside-press.js.
//
// Each case builds a throwaway package tree, points the patcher at it via the
// TRUE_SHEET_PATCH_ROOT seam, and asserts exit code, output, and — for the
// failure paths — that nothing was written (the two-phase contract). The
// anchors are extracted from the script source itself so the fixtures cannot
// drift from what the patcher actually matches.

import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, '..', 'fix-true-sheet-stacked-outside-press.js');

// The four files the patcher targets, per patch, mirroring PATCHES in the
// script (the file lists are part of the patcher's contract).
const PATCH_FILES = [
  ['src/TrueSheet.web.tsx', 'lib/module/TrueSheet.web.js'],
  ['src/web/vaul/index.tsx', 'lib/module/web/vaul/index.js'],
];

/** The anchors as the script defines them, unescaped from its source. */
const readAnchors = () => {
  const source = readFileSync(SCRIPT, 'utf8');
  const anchors = [...source.matchAll(/anchor: `([\S\s]*?)`,\n/g)].map(
    ([, raw]) => raw.replaceAll('\\`', '`'),
  );
  expect(anchors).toHaveLength(PATCH_FILES.length);
  return anchors;
};

const PACKAGE_PATH = join(
  'node_modules',
  '@lodev09',
  'react-native-true-sheet',
);

const createdRoots = [];

/**
 * Writes a pristine package fixture — the four target files, each embedding
 * the real anchor between filler lines. `mutate(relativePath, content)` lets
 * a case corrupt individual files.
 */
const writePackageFixture = (root, packagePath, mutate) => {
  const anchors = readAnchors();
  for (const [patchIndex, files] of PATCH_FILES.entries()) {
    for (const file of files) {
      const full = join(root, packagePath, file);
      mkdirSync(dirname(full), { recursive: true });
      const base = `// filler before\n${anchors[patchIndex]}\n// filler after\n`;
      writeFileSync(full, mutate ? mutate(file, base) : base);
    }
  }
};

const makeFixture = ({ mutate } = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'true-sheet-patch-'));
  createdRoots.push(root);
  writePackageFixture(root, PACKAGE_PATH, mutate);
  return { root, anchors: readAnchors() };
};

const readTree = root =>
  PATCH_FILES.flat().map(file => {
    try {
      return readFileSync(join(root, PACKAGE_PATH, file), 'utf8');
    } catch {
      return null;
    }
  });

const runPatcher = root => {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], {
      encoding: 'utf-8',
      env: { ...process.env, TRUE_SHEET_PATCH_ROOT: root },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      status: error.status,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    };
  }
};

afterAll(() => {
  for (const root of createdRoots)
    rmSync(root, { recursive: true, force: true });
});

describe('fix-true-sheet-stacked-outside-press', () => {
  it('patches every target file of a pristine install', () => {
    const { root, anchors } = makeFixture();
    const result = runPatcher(root);
    expect(result.status).toBe(0);
    expect(result.stdout.match(/Patched/g)).toHaveLength(4);
    const [tsGuard, jsGuard, tsRelease, jsRelease] = readTree(root);
    for (const content of [tsGuard, jsGuard]) {
      expect(content).toContain('compareDocumentPosition');
      expect(content).not.toContain(anchors[0]);
    }
    for (const content of [tsRelease, jsRelease]) {
      expect(content).toContain('if (!isOpen)');
      expect(content).not.toContain(anchors[1]);
    }
  });

  it('is idempotent: a second run changes nothing', () => {
    const { root } = makeFixture();
    runPatcher(root);
    const before = readTree(root);
    const result = runPatcher(root);
    expect(result.status).toBe(0);
    expect(result.stdout.match(/already patched/g)).toHaveLength(4);
    expect(readTree(root)).toEqual(before);
  });

  it('fails without writing anything when one anchor is missing', () => {
    const { root } = makeFixture({
      mutate: (file, content) =>
        file === 'lib/module/web/vaul/index.js'
          ? '// anchor was moved by an upstream release\n'
          : content,
    });
    const before = readTree(root);
    const result = runPatcher(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('anchor not found');
    expect(result.stderr).toContain('Nothing was written');
    expect(readTree(root)).toEqual(before);
  });

  it('fails without writing anything when an anchor is duplicated', () => {
    const { root } = makeFixture({
      mutate: (file, content) =>
        file === 'src/TrueSheet.web.tsx' ? content + content : content,
    });
    const before = readTree(root);
    const result = runPatcher(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('anchor is not unique');
    expect(readTree(root)).toEqual(before);
  });

  it('fails when a target file is missing from an installed package', () => {
    const { root } = makeFixture();
    rmSync(join(root, PACKAGE_PATH, 'lib/module/TrueSheet.web.js'));
    const result = runPatcher(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('target file missing');
  });

  it('skips silently when the package is not installed anywhere', () => {
    const root = mkdtempSync(join(tmpdir(), 'true-sheet-patch-'));
    createdRoots.push(root);
    mkdirSync(join(root, 'node_modules'), { recursive: true });
    const result = runPatcher(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('not installed anywhere');
  });

  it('also patches a nested workspace copy', () => {
    const { root } = makeFixture();
    const nestedPackagePath = join('apps', 'guest', PACKAGE_PATH);
    writePackageFixture(root, nestedPackagePath);
    const result = runPatcher(root);
    expect(result.status).toBe(0);
    expect(result.stdout.match(/Patched/g)).toHaveLength(8);
    expect(
      readFileSync(
        join(root, nestedPackagePath, 'src/TrueSheet.web.tsx'),
        'utf8',
      ),
    ).toContain('compareDocumentPosition');
  });
});
