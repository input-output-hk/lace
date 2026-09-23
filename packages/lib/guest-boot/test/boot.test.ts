import { selectRelease } from '@lace-lib/extension-shell-api';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  decideReleaseCheck,
  parseReleaseManifest,
  readInstallId,
  releaseEntryUrl,
} from '../src/boot';

import type { ReleaseManifest } from '@lace-lib/extension-shell-api';

const BAKED_VERSION = '1.2.0';
const INSTALL_ID = 'install-0';

/** A pointer serving `current` to the whole population unless told otherwise —
 * the shape every fixture below starts from. */
const pointer = ({
  current = '1.3.0',
  previous = BAKED_VERSION,
  rolloutPercent = 100,
}: {
  current?: string;
  previous?: string;
  rolloutPercent?: number;
} = {}): ReleaseManifest => ({
  current: { version: current, dir: current, rolloutPercent },
  previous: { version: previous, dir: previous },
});

const decide = ({
  release,
  installId = INSTALL_ID,
  phase = 'loading' as const,
  reloadedFor = [],
}: {
  release: ReleaseManifest | null;
  installId?: string;
  phase?: 'interactive' | 'loading';
  reloadedFor?: readonly string[];
}) =>
  decideReleaseCheck({
    release,
    installId,
    bakedVersion: BAKED_VERSION,
    phase,
    reloadedFor,
  });

/** Enough distinct ids to see a partial rollout actually split a population. */
const POPULATION = Array.from(
  { length: 200 },
  (_, index) => `install-${index}`,
);

const selectedVersions = (manifest: ReleaseManifest): string[] =>
  POPULATION.map(installId => selectRelease(manifest, installId).version);

describe('parseReleaseManifest', () => {
  it('accepts a pointer naming both concurrently served releases', () => {
    expect(
      parseReleaseManifest({
        current: { version: '1.3.0', dir: '1.3.0', rolloutPercent: 25 },
        previous: { version: '1.2.0', dir: '1.2.0' },
      }),
    ).toEqual({
      current: { version: '1.3.0', dir: '1.3.0', rolloutPercent: 25 },
      previous: { version: '1.2.0', dir: '1.2.0' },
    });
  });

  it('accepts a bootstrap pointer whose previous equals its current', () => {
    expect(
      parseReleaseManifest({
        current: { version: '1.2.0', dir: '1.2.0', rolloutPercent: 100 },
        previous: { version: '1.2.0', dir: '1.2.0' },
      }),
    ).toEqual({
      current: { version: '1.2.0', dir: '1.2.0', rolloutPercent: 100 },
      previous: { version: '1.2.0', dir: '1.2.0' },
    });
  });

  it('ignores unknown fields rather than refusing the pointer, so an operator-added field is not an outage', () => {
    expect(
      parseReleaseManifest({
        current: {
          version: '1.3.0',
          dir: '1.3.0',
          rolloutPercent: 25,
          notes: 'canary',
        },
        previous: { version: '1.2.0', dir: '1.2.0', notes: 'stable' },
        generatedAt: '2026-08-31T00:00:00Z',
      }),
    ).toEqual({
      current: { version: '1.3.0', dir: '1.3.0', rolloutPercent: 25 },
      previous: { version: '1.2.0', dir: '1.2.0' },
    });
  });

  it('rejects a non-object body', () => {
    expect(parseReleaseManifest('1.2.0')).toBeNull();
    expect(parseReleaseManifest(null)).toBeNull();
    expect(parseReleaseManifest(undefined)).toBeNull();
  });

  it('rejects a pointer that names only one release', () => {
    expect(parseReleaseManifest({})).toBeNull();
    expect(
      parseReleaseManifest({
        current: { version: '1.3.0', dir: '1.3.0', rolloutPercent: 100 },
      }),
    ).toBeNull();
    expect(
      parseReleaseManifest({ previous: { version: '1.2.0', dir: '1.2.0' } }),
    ).toBeNull();
  });

  it('rejects a release entry missing its directory, which names no tree to load', () => {
    expect(
      parseReleaseManifest({
        current: { version: '1.3.0', rolloutPercent: 100 },
        previous: { version: '1.2.0', dir: '1.2.0' },
      }),
    ).toBeNull();
    expect(
      parseReleaseManifest({
        current: { version: '1.3.0', dir: '', rolloutPercent: 100 },
        previous: { version: '1.2.0', dir: '1.2.0' },
      }),
    ).toBeNull();
  });

  it('rejects a directory that is not one origin-root segment, as the host does for the same document', () => {
    for (const directory of [
      '../1.2.0',
      'releases/1.3.0',
      '.',
      '-1.3.0',
      '1.3 0',
    ]) {
      expect(
        parseReleaseManifest({
          current: { version: '1.3.0', dir: directory, rolloutPercent: 100 },
          previous: { version: '1.2.0', dir: '1.2.0' },
        }),
      ).toBeNull();
    }
  });

  it('rejects a non-string version', () => {
    expect(
      parseReleaseManifest({
        current: { version: 130, dir: '1.3.0', rolloutPercent: 100 },
        previous: { version: '1.2.0', dir: '1.2.0' },
      }),
    ).toBeNull();
  });

  it('rejects a rollout percent that is not a finite number, so the cohort is never drawn from garbage', () => {
    expect(
      parseReleaseManifest({
        current: { version: '1.3.0', dir: '1.3.0' },
        previous: { version: '1.2.0', dir: '1.2.0' },
      }),
    ).toBeNull();
    expect(
      parseReleaseManifest({
        current: { version: '1.3.0', dir: '1.3.0', rolloutPercent: '100' },
        previous: { version: '1.2.0', dir: '1.2.0' },
      }),
    ).toBeNull();
    expect(
      parseReleaseManifest({
        current: { version: '1.3.0', dir: '1.3.0', rolloutPercent: Number.NaN },
        previous: { version: '1.2.0', dir: '1.2.0' },
      }),
    ).toBeNull();
  });

  it('rejects the single-version pointer of the pre-rollout deliverable', () => {
    expect(parseReleaseManifest({ version: '1.2.0' })).toBeNull();
  });
});

describe('readInstallId', () => {
  const MOUNT_URL = 'https://guest.example/1.2.0/';

  const stubMount = ({
    hash = '',
    stored = null as string | null,
    storageThrows = false,
  }): { setItem: ReturnType<typeof vi.fn> } => {
    const setItem = vi.fn();
    vi.stubGlobal('location', { hash, href: MOUNT_URL });
    vi.stubGlobal('localStorage', {
      getItem: () => {
        if (storageThrows) throw new Error('storage unavailable');
        return stored;
      },
      setItem,
    });
    return { setItem };
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers the id the host handed over on the mount fragment', () => {
    stubMount({ hash: '#iid=host-42', stored: 'guest-minted' });
    expect(readInstallId(BAKED_VERSION)).toBe('host-42');
  });

  it('never persists the host id, so the two never fork', () => {
    const { setItem } = stubMount({ hash: '#iid=host-42' });
    readInstallId(BAKED_VERSION);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('falls back to the stored guest id when no host handed one over', () => {
    stubMount({ hash: '', stored: 'guest-minted' });
    expect(readInstallId(BAKED_VERSION)).toBe('guest-minted');
  });

  it('ignores a fragment carrying no usable id', () => {
    for (const hash of ['#', '#iid=', '#route/settings', '#other=host-42']) {
      stubMount({ hash, stored: 'guest-minted' });
      expect(readInstallId(BAKED_VERSION)).toBe('guest-minted');
      vi.unstubAllGlobals();
    }
  });

  it('mints and stores a guest id when there is neither a fragment nor a stored one', () => {
    const { setItem } = stubMount({ hash: '', stored: null });
    const minted = readInstallId(BAKED_VERSION);
    expect(minted.length).toBeGreaterThan(0);
    expect(setItem).toHaveBeenCalledWith('lace-guest:install-id', minted);
  });

  it("answers the caller's stable fallback when storage is refused outright", () => {
    stubMount({ hash: '', storageThrows: true });
    expect(readInstallId(BAKED_VERSION)).toBe(BAKED_VERSION);
  });
});

describe('releaseEntryUrl', () => {
  const MOUNT_URL = 'https://guest.example/1.2.0/index.html';

  it('targets the entry document of the named release tree', () => {
    expect(releaseEntryUrl(MOUNT_URL, '1.3.0', '')).toBe(
      'https://guest.example/1.3.0/',
    );
  });

  it('carries the install-id fragment into the adopted release, so the next boot draws the same cohort', () => {
    expect(releaseEntryUrl(MOUNT_URL, '1.3.0', '#iid=host-42')).toBe(
      'https://guest.example/1.3.0/#iid=host-42',
    );
  });
});

describe('selectRelease', () => {
  it('answers the same release every time for one install and pointer', () => {
    const manifest = pointer({ rolloutPercent: 50 });
    const first = selectRelease(manifest, INSTALL_ID);
    expect(selectRelease(manifest, INSTALL_ID)).toEqual(first);
    expect(selectRelease(pointer({ rolloutPercent: 50 }), INSTALL_ID)).toEqual(
      first,
    );
  });

  it('answers the directory alongside the version, since that is what a client loads', () => {
    expect(
      selectRelease(
        {
          current: { version: '1.3.0', dir: 'rel-1.3.0', rolloutPercent: 100 },
          previous: { version: '1.2.0', dir: 'rel-1.2.0' },
        },
        INSTALL_ID,
      ),
    ).toEqual({ version: '1.3.0', dir: 'rel-1.3.0' });
  });

  it('puts nobody on current at 0 percent', () => {
    expect(selectedVersions(pointer({ rolloutPercent: 0 }))).toEqual(
      POPULATION.map(() => BAKED_VERSION),
    );
  });

  it('puts everybody on current at 100 percent', () => {
    expect(selectedVersions(pointer({ rolloutPercent: 100 }))).toEqual(
      POPULATION.map(() => '1.3.0'),
    );
  });

  it('splits the population in between, and only ever adds to the cohort as the rollout is raised', () => {
    const cohortAt = (rolloutPercent: number): Set<string> =>
      new Set(
        POPULATION.filter(
          installId =>
            selectRelease(pointer({ rolloutPercent }), installId).version ===
            '1.3.0',
        ),
      );
    const early = cohortAt(10);
    const half = cohortAt(50);
    expect(early.size).toBeGreaterThan(0);
    expect(early.size).toBeLessThan(half.size);
    expect(half.size).toBeLessThan(POPULATION.length);
    expect([...early].every(installId => half.has(installId))).toBe(true);
  });

  it('answers the same bytes either way on a bootstrap pointer whose previous equals its current', () => {
    const bootstrap = pointer({
      current: '1.2.0',
      previous: '1.2.0',
      rolloutPercent: 20,
    });
    expect(selectedVersions(bootstrap)).toEqual(POPULATION.map(() => '1.2.0'));
  });
});

describe('decideReleaseCheck', () => {
  it('adopts a newer release while still loading, naming the directory to load', () => {
    expect(decide({ release: pointer({ current: '1.3.0' }) })).toEqual({
      adopt: true,
      version: '1.3.0',
      dir: '1.3.0',
    });
  });

  it('adopts an older release while still loading, so a rollback reaches online clients', () => {
    expect(
      decide({
        release: pointer({ current: '1.1.0', previous: '1.1.0' }),
      }),
    ).toEqual({ adopt: true, version: '1.1.0', dir: '1.1.0' });
  });

  it('adopts any mismatch, including versions that do not order against the baked one', () => {
    expect(decide({ release: pointer({ current: '0.0.0-dev' }) })).toEqual({
      adopt: true,
      version: '0.0.0-dev',
      dir: '0.0.0-dev',
    });
  });

  it('settles as current when the pinned release equals the baked build', () => {
    expect(decide({ release: pointer({ current: BAKED_VERSION }) })).toEqual({
      adopt: false,
      status: 'current',
    });
  });

  it('compares against previous for an install outside the rollout cohort', () => {
    // Outside the cohort the baked build IS the pinned release, even though a
    // newer current is being served to the cohort at the same time.
    expect(
      decide({
        release: pointer({ current: '1.3.0', rolloutPercent: 0 }),
      }),
    ).toEqual({ adopt: false, status: 'current' });
  });

  it('adopts previous when the install is outside the cohort but runs current', () => {
    // The rollout was pulled back: this install is on 1.3.0 and now pins the
    // 1.2.0 tree, so it must load THAT — not stay on whatever it cached.
    expect(
      decideReleaseCheck({
        release: pointer({ current: '1.3.0', rolloutPercent: 0 }),
        installId: INSTALL_ID,
        bakedVersion: '1.3.0',
        phase: 'loading',
        reloadedFor: [],
      }),
    ).toEqual({ adopt: true, version: BAKED_VERSION, dir: BAKED_VERSION });
  });

  it('errors without adopting when release.json is unreachable or malformed', () => {
    expect(decide({ release: null })).toEqual({
      adopt: false,
      status: 'error',
    });
  });

  it('never adopts once the loading phase ended, in either mismatch direction', () => {
    expect(
      decide({ release: pointer({ current: '1.3.0' }), phase: 'interactive' }),
    ).toEqual({ adopt: false, status: 'stale-mismatch' });
    expect(
      decide({
        release: pointer({ current: '1.1.0', previous: '1.1.0' }),
        phase: 'interactive',
      }),
    ).toEqual({ adopt: false, status: 'stale-mismatch' });
  });

  it('does not adopt a version this tab session already reloaded for', () => {
    expect(
      decide({
        release: pointer({ current: '1.3.0' }),
        reloadedFor: ['1.3.0'],
      }),
    ).toEqual({ adopt: false, status: 'already-reloaded' });
  });

  it('adopts when the tab reloaded for a different version than the one now pinned', () => {
    expect(
      decide({
        release: pointer({ current: '1.3.0' }),
        reloadedFor: ['1.1.0'],
      }),
    ).toEqual({ adopt: true, version: '1.3.0', dir: '1.3.0' });
  });

  it('refuses EVERY version this tab session already reloaded for, so a flapping origin alternating two versions cannot ping-pong', () => {
    const reloadedFor = ['1.1.0', '1.3.0'];
    expect(
      decide({
        release: pointer({ current: '1.1.0', previous: '1.1.0' }),
        reloadedFor,
      }),
    ).toEqual({ adopt: false, status: 'already-reloaded' });
    expect(
      decide({ release: pointer({ current: '1.3.0' }), reloadedFor }),
    ).toEqual({ adopt: false, status: 'already-reloaded' });
  });

  it('reports a mid-session mismatch as stale even when the anti-loop guard also holds', () => {
    expect(
      decide({
        release: pointer({ current: '1.3.0' }),
        phase: 'interactive',
        reloadedFor: ['1.3.0'],
      }),
    ).toEqual({ adopt: false, status: 'stale-mismatch' });
  });
});
