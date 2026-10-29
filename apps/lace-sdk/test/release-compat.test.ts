import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  allowsBreakingChange,
  canaryReleaseProblems,
  compareExports,
  compareVersions,
  latestCanarySinceOf,
  latestStableOf,
  parseVersion,
  readExports,
  republishProblems,
  stableReleaseProblems,
} from '../scripts/release-compat';

const declarations = (source: string) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-compat-'));
  const file = path.join(directory, 'index.d.ts');
  fs.writeFileSync(file, source);
  return readExports({ index: file });
};

const PREVIOUS = `
declare function createWallet(name: string): Promise<void>;
/** @deprecated Use createWallet. */
declare function openWallet(name: string): Promise<void>;
type Result$1<T> = { ok: T };
interface Account { id: string }
export { createWallet, openWallet, type Result$1 as Result, type Account };
`;

describe('readExports', () => {
  it('records each export with its declaration and deprecation', () => {
    const exports = declarations(PREVIOUS);
    expect([...exports.keys()].sort()).toEqual([
      'index:Account',
      'index:Result',
      'index:createWallet',
      'index:openWallet',
    ]);
    expect(exports.get('index:openWallet')?.deprecated).toBe(true);
    expect(exports.get('index:createWallet')?.deprecated).toBe(false);
  });

  it('ignores a renamed collision suffix and whitespace', () => {
    const renamed = declarations(
      PREVIOUS.replaceAll('Result$1', 'Result$2').replace(
        'interface Account { id: string }',
        'interface Account {\n  id: string\n}',
      ),
    );
    expect(compareExports(declarations(PREVIOUS), renamed)).toEqual({
      added: [],
      removed: [],
      changed: [],
    });
  });
  it('ignores a change to doc comments only', () => {
    const documented = (summary: string) =>
      declarations(`
/** ${summary} */
interface Options$1 {
  /** ${summary} */
  retries: number; // ${summary}
}
/**
 * ${summary}
 * @param options - ${summary}
 */
declare function createWallet(options: Options$1): Promise<void>;
/** ${summary} */
declare const VERSION: string;
export { createWallet, VERSION };
`);
    expect(
      compareExports(
        documented('Creates a wallet.'),
        documented('Creates a wallet; see the guide.'),
      ),
    ).toEqual({ added: [], removed: [], changed: [] });
  });

  it('reads @deprecated from documented declarations, as the published types carry them', () => {
    const exports = declarations(`
/**
 * The wallet's options.
 */
interface Options {
  /** How many times to retry. */
  retries: number;
}
/**
 * Opens a wallet.
 *
 * @param options - How to open it.
 * @deprecated Use createWallet.
 */
declare function openWallet(options: Options): Promise<void>;
/**
 * The SDK's version.
 *
 * @deprecated Read it from package.json.
 */
declare const VERSION: string;
/** The default retries. */
declare const RETRIES = 3;
declare const _default$1: Options;
declare namespace modules_d {
  export { _default$1 as storage };
}
export { openWallet, VERSION, RETRIES, type Options, modules_d as m };
`);
    expect(
      Object.fromEntries(
        [...exports.values()].map(({ key, deprecated }) => [key, deprecated]),
      ),
    ).toEqual({
      'index:Options': false,
      'index:RETRIES': false,
      'index:VERSION': true,
      'index:m': false,
      'index:openWallet': true,
    });
  });

  it('counts a change to an unexported type an export references', () => {
    const withOptions = (field: string) =>
      declarations(`
interface Options$1 { ${field} }
interface Network { magic: Options$1 }
declare function createWallet(network: Network): Promise<void>;
export { createWallet };
`);
    expect(
      compareExports(
        withOptions('retries: number'),
        withOptions('retries: string'),
      ).changed,
    ).toEqual(['index:createWallet']);
  });

  it('counts a change to a namespace member declared as a constant', () => {
    const withModule = (type: string) =>
      declarations(`
declare const _default$1: ${type};
declare namespace modules_d {
  export { _default$1 as storageInMemory };
}
export { modules_d as m };
`);
    expect(
      compareExports(withModule('Module<string>'), withModule('Module<number>'))
        .changed,
    ).toEqual(['index:m']);
  });

  it('compares an exported type on its own, not through its users', () => {
    const usingAccount = PREVIOUS.replace(
      'createWallet(name: string)',
      'createWallet(name: string, account?: Account)',
    );
    expect(
      compareExports(
        declarations(usingAccount),
        declarations(
          usingAccount.replace(
            'interface Account { id: string }',
            'interface Account { id: number }',
          ),
        ),
      ).changed,
    ).toEqual(['index:Account']);
  });
});

describe('readExports with followRelativeImports', () => {
  // A bundler that splits shared declarations into chunks leaves each entry a
  // re-export of names declared in a chunk.
  const chunkedPackage = (chunk: string) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-compat-'));
    fs.writeFileSync(path.join(directory, 'index-abc.d.ts'), chunk);
    const entry = path.join(directory, 'util.d.ts');
    fs.writeFileSync(
      entry,
      'import { y, z } from "./index-abc.js";\nexport { y, z };\n',
    );
    return entry;
  };
  const chunk = `/** @deprecated use y */
declare const z: number;
interface Shape { a: string }
declare const y: Shape;
export { y, z };
`;

  it('reads declarations and deprecation through a chunk', () => {
    const exports = readExports(
      { util: chunkedPackage(chunk) },
      { followRelativeImports: true },
    );
    expect(exports.get('util:z')).toEqual({
      key: 'util:z',
      signature: 'z: number',
      deprecated: true,
    });
    expect(exports.get('util:y')?.signature).toBe(
      'y: Shape\ninterface Shape { a: string; }',
    );
  });

  it('sees only names without it', () => {
    expect(readExports({ util: chunkedPackage(chunk) }).get('util:y')).toEqual({
      key: 'util:y',
      signature: 'y',
      deprecated: false,
    });
  });

  it('counts a change behind a chunk', () => {
    const read = (source: string) =>
      readExports(
        { util: chunkedPackage(source) },
        { followRelativeImports: true },
      );
    expect(
      compareExports(read(chunk), read(chunk.replace('a: string', 'a: number')))
        .changed,
    ).toEqual(['util:y']);
  });

  it('leaves a third-party import unresolved', () => {
    const entry = chunkedPackage(
      'import type { Logger } from "pino";\ndeclare const y: Logger;\ndeclare const z: number;\nexport { y, z };\n',
    );
    expect(
      readExports({ util: entry }, { followRelativeImports: true }).get(
        'util:y',
      )?.signature,
    ).toBe('y: Logger');
  });
});

describe('stableReleaseProblems', () => {
  const previous = declarations(PREVIOUS);

  it('accepts an addition in a patch release', () => {
    const next = declarations(
      `${PREVIOUS}\ndeclare const VERSION: string;\nexport { VERSION };`,
    );
    expect(
      stableReleaseProblems({
        previousVersion: '0.1.0',
        nextVersion: '0.1.1',
        previous,
        next,
        overrides: [],
      }),
    ).toEqual([]);
  });

  it('refuses a removal in a patch release before 1.0', () => {
    const next = declarations(PREVIOUS.replace('openWallet, ', ''));
    expect(
      stableReleaseProblems({
        previousVersion: '0.1.0',
        nextVersion: '0.1.1',
        previous,
        next,
        overrides: [],
      }),
    ).toEqual([
      '0.1.1 changes or removes index:openWallet after 0.1.0; a minor release is required, or a release-overrides.json entry for a change that is compatible',
    ]);
  });

  it('accepts removing a deprecated export in a minor release before 1.0', () => {
    const next = declarations(PREVIOUS.replace('openWallet, ', ''));
    expect(
      stableReleaseProblems({
        previousVersion: '0.1.0',
        nextVersion: '0.2.0',
        previous,
        next,
        overrides: [],
      }),
    ).toEqual([]);
  });

  it('refuses changing an export that was not deprecated', () => {
    const next = declarations(
      PREVIOUS.replace(
        'createWallet(name: string)',
        'createWallet(name: string, network: string)',
      ),
    );
    expect(
      stableReleaseProblems({
        previousVersion: '0.1.0',
        nextVersion: '0.2.0',
        previous,
        next,
        overrides: [],
      }),
    ).toEqual([
      'index:createWallet changes or is removed without being @deprecated in 0.1.0',
    ]);
  });

  it('accepts a change the release declares compatible', () => {
    const next = declarations(
      PREVIOUS.replace(
        'interface Account { id: string }',
        'interface Account { readonly id: string }',
      ),
    );
    expect(
      stableReleaseProblems({
        previousVersion: '0.1.0',
        nextVersion: '0.1.1',
        previous,
        next,
        overrides: [
          {
            version: '0.1.1',
            export: 'index:Account',
            reason: 'readonly field',
          },
        ],
      }),
    ).toEqual([]);
  });

  it('requires a major release for a breaking change from 1.0', () => {
    const v1 = declarations(PREVIOUS);
    const next = declarations(PREVIOUS.replace('openWallet, ', ''));
    expect(
      stableReleaseProblems({
        previousVersion: '1.2.0',
        nextVersion: '1.3.0',
        previous: v1,
        next,
        overrides: [],
      }),
    ).toEqual([
      '1.3.0 changes or removes index:openWallet after 1.2.0; a major release is required, or a release-overrides.json entry for a change that is compatible',
    ]);
  });

  it('refuses a version that is not above the latest stable', () => {
    expect(
      stableReleaseProblems({
        previousVersion: '0.2.0',
        nextVersion: '0.1.5',
        previous,
        next: previous,
        overrides: [],
      }),
    ).toEqual(['0.1.5 is not above the latest stable 0.2.0']);
  });
});

describe('canaryReleaseProblems', () => {
  it('refuses a canary before the first stable release', () => {
    expect(
      canaryReleaseProblems({
        latestStable: undefined,
        canaryVersion: '0.1.0-canary.1',
      }),
    ).toEqual([
      "0.1.0-canary.1 would be the package's first version, which npm makes its latest: release a stable version first",
    ]);
  });

  it('accepts a canary of the next version', () => {
    expect(
      canaryReleaseProblems({
        latestStable: '0.1.0',
        canaryVersion: '0.2.0-canary.1',
      }),
    ).toEqual([]);
  });

  it('refuses a canary of a version already released', () => {
    expect(
      canaryReleaseProblems({
        latestStable: '0.1.0',
        canaryVersion: '0.1.0-canary.5',
      }),
    ).toEqual([
      '0.1.0-canary.5 previews 0.1.0, which is not above the latest stable 0.1.0',
    ]);
  });

  it('refuses a canary below a canary already published', () => {
    expect(
      canaryReleaseProblems({
        latestStable: '0.1.0',
        latestCanary: '0.2.0-canary.2',
        canaryVersion: '0.2.0-canary.1',
      }),
    ).toEqual([
      '0.2.0-canary.1 is below 0.2.0-canary.2, which is already published: releasing it would move the canary dist-tag back, so cut a newer canary',
    ]);
  });

  it('holds a canary to canaries alone: a stable release below one does not count', () => {
    // 0.3.0-canary.0 was published, then 0.2.1 shipped below it.
    expect(
      canaryReleaseProblems({
        latestStable: '0.2.1',
        latestCanary: latestCanarySinceOf(['0.2.0', '0.3.0-canary.0', '0.2.1']),
        canaryVersion: '0.3.0-canary.1',
      }),
    ).toEqual([]);
  });

  it('accepts a re-run of the latest canary and a newer canary', () => {
    for (const canaryVersion of ['0.2.0-canary.2', '0.2.0-canary.10']) {
      expect(
        canaryReleaseProblems({
          latestStable: '0.1.0',
          latestCanary: '0.2.0-canary.2',
          canaryVersion,
        }),
      ).toEqual([]);
    }
  });
});

describe('versions', () => {
  it('finds the latest stable among prereleases', () => {
    expect(latestStableOf(['0.1.0', '0.2.0-canary.1', '0.1.10', '0.1.2'])).toBe(
      '0.1.10',
    );
    expect(latestStableOf(['0.1.0-canary.1'])).toBeUndefined();
  });

  it('finds the latest canary since the latest stable release', () => {
    expect(
      latestCanarySinceOf(['0.1.0', '0.2.0-canary.10', '0.2.0-canary.2']),
    ).toBe('0.2.0-canary.10');
    // 0.2.0-canary.3 is history once 0.2.1 is out; 0.3.0-canary.0 is not.
    expect(
      latestCanarySinceOf(['0.2.0-canary.3', '0.3.0-canary.0', '0.2.1']),
    ).toBe('0.3.0-canary.0');
    expect(latestCanarySinceOf(['0.2.0-canary.3', '0.2.1'])).toBeUndefined();
    expect(latestCanarySinceOf([])).toBeUndefined();
  });

  it('orders a prerelease below its release and canaries numerically', () => {
    const order = ['0.1.0-canary.2', '0.1.0-canary.10', '0.1.0', '0.2.0'].map(
      parseVersion,
    );
    for (let index = 1; index < order.length; index += 1) {
      expect(compareVersions(order[index - 1], order[index])).toBeLessThan(0);
    }
  });

  it('allows a breaking change in a minor release only before 1.0', () => {
    expect(
      allowsBreakingChange(parseVersion('0.1.0'), parseVersion('0.2.0')),
    ).toBe(true);
    expect(
      allowsBreakingChange(parseVersion('1.1.0'), parseVersion('1.2.0')),
    ).toBe(false);
    expect(
      allowsBreakingChange(parseVersion('1.1.0'), parseVersion('2.0.0')),
    ).toBe(true);
  });
});

describe('republishProblems', () => {
  /** An unpacked package/ directory holding `files`. */
  const unpacked = (files: Record<string, string>) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'republish-'));
    for (const [file, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(directory, file)), {
        recursive: true,
      });
      fs.writeFileSync(path.join(directory, file), text);
    }
    return directory;
  };
  const PACKAGE = {
    'package.json': '{ "name": "@laceio/sdk", "version": "0.2.0" }\n',
    'dist/index.js': 'export const a = 1;\n',
    'dist/index.d.ts': 'export declare const a: number;\n',
  };

  it('passes the version npm has when this build holds the same files', () => {
    expect(
      republishProblems({
        name: '@laceio/sdk',
        version: '0.2.0',
        published: unpacked(PACKAGE),
        built: unpacked(PACKAGE),
      }),
    ).toEqual([]);
  });

  it('refuses the version npm has when a file differs, naming it', () => {
    expect(
      republishProblems({
        name: '@laceio/sdk',
        version: '0.2.0',
        published: unpacked(PACKAGE),
        built: unpacked({
          ...PACKAGE,
          'dist/index.js': 'export const a = 2;\n',
        }),
      }),
    ).toEqual([
      '@laceio/sdk@0.2.0 is already published and this build differs from it (dist/index.js): a published version is final, so cut a new release',
    ]);
  });

  it('refuses a build that adds or drops a file', () => {
    const { 'dist/index.d.ts': _dropped, ...withoutTypes } = PACKAGE;
    expect(
      republishProblems({
        name: '@laceio/sdk',
        version: '0.2.0-canary.1',
        published: unpacked(PACKAGE),
        built: unpacked({ ...withoutTypes, 'dist/extra.js': '' }),
      }),
    ).toEqual([
      '@laceio/sdk@0.2.0-canary.1 is already published and this build differs from it (dist/extra.js, dist/index.d.ts): a published version is final, so cut a new release',
    ]);
  });
});
