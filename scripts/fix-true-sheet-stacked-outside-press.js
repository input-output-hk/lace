#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Postinstall patches for @lodev09/react-native-true-sheet's WEB implementation
 * (same mechanism as fix-wallet-sdk-abstractions.js). Two independent fixes:
 *
 * 1. Stacked-sheet outside press: every sheet is its own Radix dialog layered
 *    as a sibling in the shared portal, so a press inside a stacked descendant
 *    reads as an "outside" press to every sheet beneath it — the parent
 *    dismisses itself and the whole navigation stack collapses.
 * 2. Release snap-back: the pointer release of the press that dismissed a
 *    sheet still runs vaul's snap logic, which unconditionally undoes the
 *    wrapper transform and cancels the dismiss slide — the sheet froze in
 *    place and blinked out on unmount.
 *
 * Tracking: LW-15330; upstream report with both defects and the proposed
 * guards: https://github.com/lodev09/react-native-true-sheet/issues/816.
 * Remove BOTH patches only once a consumed release fixes both defects
 * upstream; each anchor failing individually on a version bump is what the
 * hard `exit(1)` below surfaces.
 *
 * Every install of the package must be patched — the hoisted root copy and any
 * nested workspace copy — so the script fails the install when a target file
 * is missing from an installed copy or an anchor no longer matches. Nothing is
 * written unless every target in every copy validates first.
 */

const fs = require('fs');
const path = require('path');

// Overridable so the test harness can point the script at a fixture tree.
const REPO_ROOT =
  process.env.TRUE_SHEET_PATCH_ROOT ?? path.join(__dirname, '..');
const PACKAGE_PATH = ['@lodev09', 'react-native-true-sheet'];

/** Every installed copy of the package: the hoisted root install plus any
 * nested per-workspace installs (a workspace pinning a different version
 * gives that app an unpatched copy unless it is patched too). */
const findInstalledCopies = () => {
  const roots = [path.join(REPO_ROOT, 'node_modules')];
  for (const workspaceGroup of [
    'apps',
    'packages/contract',
    'packages/lib',
    'packages/module',
  ]) {
    const base = path.join(REPO_ROOT, workspaceGroup);
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base)) {
      roots.push(path.join(base, entry, 'node_modules'));
    }
  }
  return roots
    .map(root => path.join(root, ...PACKAGE_PATH))
    .filter(packageDirectory => fs.existsSync(packageDirectory));
};

// One anchor/replacement per patch, applied to both the TypeScript source
// (Metro resolves the package's exports "source" condition) and the compiled
// module (webpack and node resolve "main"/"module"). The hunks are
// byte-identical in both files, so a single literal patches both; the
// idempotence check is `content.includes(replacement)`, so the replacement
// text is its own marker.
const PATCHES = [
  {
    name: 'stacked sheets no longer dismiss their parent on inside presses',
    files: [
      path.join('src', 'TrueSheet.web.tsx'),
      path.join('lib', 'module', 'TrueSheet.web.js'),
    ],
    anchor: `    // The footer is rendered via vaul's \`detachedSiblings\` as a sibling of
    // Drawer.Content inside [data-vaul-detached-wrapper], so Radix treats
    // clicks on it as "outside" the content. Don't dismiss for clicks that
    // landed inside the wrapper.
    if (target instanceof Element) {
      const wrapper = drawerContentRef.current?.closest('[data-vaul-detached-wrapper]');
      if (wrapper && wrapper.contains(target)) {
        e.preventDefault();
      }
    }
  };`,
    replacement: `    if (target instanceof Element) {
      const ownWrapper = drawerContentRef.current?.closest('[data-vaul-detached-wrapper]');
      const targetWrapper = target.closest('[data-vaul-detached-wrapper]');
      // A press inside a sheet stacked ABOVE this one is not an outside press.
      // "Above" is document order in the shared portal (presentation order) —
      // not the open-stack state, which a dismissing descendant has already
      // left when Radix dispatches on the deferred click. A disconnected
      // wrapper compares nondeterministically, so it counts as above:
      // suppressing a dismissal fails safe.
      if (ownWrapper && targetWrapper && targetWrapper !== ownWrapper) {
        const position = ownWrapper.compareDocumentPosition(targetWrapper);
        const above = Node.DOCUMENT_POSITION_FOLLOWING | Node.DOCUMENT_POSITION_DISCONNECTED;
        if ((position & above) !== 0) {
          e.preventDefault();
          return;
        }
      }
      // The footer is rendered via vaul's \`detachedSiblings\` as a sibling of
      // Drawer.Content inside [data-vaul-detached-wrapper], so Radix treats
      // clicks on it as "outside" the content. Don't dismiss for clicks that
      // landed inside the wrapper.
      if (ownWrapper && ownWrapper.contains(target)) {
        e.preventDefault();
      }
    }
  };`,
  },
  {
    name: 'pointer release no longer snaps a dismissing sheet back',
    files: [
      path.join('src', 'web', 'vaul', 'index.tsx'),
      path.join('lib', 'module', 'web', 'vaul', 'index.js'),
    ],
    anchor: `    setIsDragging(false);
    dragEndTime.current = new Date();
    const swipeAmount = getTranslate(drawerRef.current, direction);
`,
    replacement: `    setIsDragging(false);
    dragEndTime.current = new Date();
    // A dismissing drawer must not snap: the press that dismissed the sheet
    // still releases here (a press marks isDragging on pointer down), and
    // snapToPoint would cancel the slide-out the close effect just queued.
    // Drag-to-dismiss releases while still open, so it is unaffected. The
    // release callback still fires so the consumer's drag state resets.
    if (!isOpen) {
      if (pointerEvent) onReleaseProp?.(pointerEvent, true);
      return;
    }
    const swipeAmount = getTranslate(drawerRef.current, direction);
`,
  },
];

const relative = filePath => path.relative(REPO_ROOT, filePath);

const copies = findInstalledCopies();
if (copies.length === 0) {
  console.log(
    '[postinstall] @lodev09/react-native-true-sheet is not installed anywhere, skipping patches',
  );
  process.exit(0);
}

// Validate everything before writing anything, so a version bump that moves
// one anchor cannot leave node_modules half-patched.
const writes = [];
const failures = [];
for (const copy of copies) {
  for (const patch of PATCHES) {
    for (const file of patch.files) {
      const filePath = path.join(copy, file);
      if (!fs.existsSync(filePath)) {
        failures.push(
          `${relative(filePath)}: target file missing from installed package`,
        );
        continue;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(patch.replacement)) {
        console.log(
          `[postinstall] ${relative(filePath)} already patched (${patch.name})`,
        );
        continue;
      }
      const occurrences = content.split(patch.anchor).length - 1;
      if (occurrences === 0) {
        failures.push(
          `${relative(filePath)}: anchor not found (${patch.name})`,
        );
        continue;
      }
      // `String.replace` rewrites only the first occurrence, so a duplicated
      // anchor would silently leave the others unpatched.
      if (occurrences > 1) {
        failures.push(
          `${relative(
            filePath,
          )}: anchor is not unique (${occurrences} occurrences, ${patch.name})`,
        );
        continue;
      }
      writes.push({ filePath, patch, content });
    }
  }
}

if (failures.length > 0) {
  console.error(
    '[postinstall] fix-true-sheet-stacked-outside-press could not patch every installed copy:\n' +
      failures.map(failure => `  - ${failure}`).join('\n') +
      "\nThe package version or layout likely changed. Verify whether LW-15330's fixes " +
      'shipped upstream; update or remove this patch accordingly. Nothing was written.',
  );
  process.exit(1);
}

for (const { filePath, patch, content } of writes) {
  fs.writeFileSync(
    filePath,
    content.replace(patch.anchor, patch.replacement),
    'utf8',
  );
  console.log(`[postinstall] Patched ${relative(filePath)}: ${patch.name}`);
}
