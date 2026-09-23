// Runtime-delivery boot (ADR 54): offline-first cache boot + the
// network-first, NON-blocking release.json check that may self-reload the
// guest WHILE STILL LOADING — and never after.
//
// Rules implemented (ADR 54):
// - Render from cache immediately (the precache makes this inherent); the
//   boot work defines an explicit LOADING phase (LOADING_MS simulates the
//   real app's store/module-loader boot).
// - During LOADING, fetch /release.json network-first (cache: 'no-store').
//   NON-blocking: a slow or failed check never delays interactivity — the
//   loading phase ends on its own timer regardless.
// - The pointer names TWO concurrently served releases and this install pins
//   exactly one — hashing the install id the HOST hands over on the mount
//   URL's fragment (/<dir>/#iid=<id>) against current.rolloutPercent with
//   selectRelease, the same contract function the host runs to resolve that
//   mount — never "whatever was cached". If the pinned release's version
//   DIFFERS from the baked build version — newer OR older — adopt it while
//   loading. Adoption keys on ANY mismatch because a rollback re-points the
//   pointer at an OLDER release, which a strictly-newer client would refuse.
// - Adopting is a NAVIGATION into the pinned release's own tree (/<dir>/ —
//   ADR 54 Layout A, fragment carried forward), which has its own service
//   worker: there is nothing
//   in THIS document's scope to update. Only when the pointer pins the tree
//   already loaded is the worker-update dance the mechanism — ask the
//   registration to update, wait for the updated worker to take control
//   (skipWaiting + clientsClaim → controllerchange), then load, so the load is
//   served from the NEW precache. The loading phase is HELD throughout, so the
//   hop always happens while loading; if no updated worker takes control in
//   time the hold is released and the release is adopted on the next open.
// - Once interactive, NEVER reload mid-session: nothing re-checks
//   release.json after boot; a mismatched release is adopted on the next open
//   only. Nothing can evict a running build — the pointer carries no version
//   floor and no remote stop lever (ADR 54).
// - Anti-loop guard: at most ONE self-reload per target version per tab
//   session (a sessionStorage-backed SET of adopted versions) — a release.json
//   pointing at a version whose build never becomes fetchable must not
//   reload-loop, and with adopt-on-mismatch a flapping origin alternating two
//   versions must not ping-pong either (a single last-version value would
//   forget the first version by the second flip).
//
// Observability (test observability is a feature): the state machine is
// exposed as window.__guestBoot and posted to the embedding parent as
// 'lace-shell-guest:status' messages. The host's offscreen pre-warm document
// uses the swReady signal to detect warm completion; the message type string
// is deliberately DUPLICATED there, never imported (the guest is never
// bundled with host code — the ADR 33 red line).
//
// Ported from the reference throwaway guest; the divergences are that the
// baked build version arrives as a startBoot argument (each guest app's
// bundler stamps it, instead of the reference's vite define) and
// adopt-on-mismatch replacing the reference's strictly-newer comparison.

import {
  isReleaseDirectory,
  selectRelease,
} from '@lace-lib/extension-shell-api';

import type { ReleaseManifest } from '@lace-lib/extension-shell-api';

export type BootPhase = 'interactive' | 'loading';

export type ReleaseCheckStatus =
  | 'adopt-timeout'
  | 'adopting'
  | 'already-reloaded'
  | 'current'
  | 'error'
  | 'pending'
  | 'reloading'
  | 'stale-mismatch';

/** Outcome of the release check: adopt the pinned release — named by the
 * origin-root directory its tree is served from — or settle on a terminal
 * status without reloading. */
export type ReleaseCheckDecision =
  | {
      adopt: false;
      status: 'already-reloaded' | 'current' | 'error' | 'stale-mismatch';
    }
  | { adopt: true; version: string; dir: string };

export type GuestBootState = {
  /** Baked build version, as handed to `startBoot`. */
  version: string;
  phase: BootPhase;
  releaseCheck: ReleaseCheckStatus;
  /** Every release.json version a self-reload was triggered for (this tab). */
  reloadedFor: readonly string[];
  /** Was this document SW-controlled at its FIRST script (index.html hook)?
   * True only when a pre-existing (e.g. pre-warmed) registration intercepted
   * the navigation — the page's own register() below cannot cause it. */
  controlledAtStart: boolean;
  /** navigator.serviceWorker.ready resolved (active SW ⇒ precache complete). */
  swReady: boolean;
  /** Boots of this tab session (sessionStorage) — a self-reload increments it. */
  bootCount: number;
  /** How the last adoption wait settled (diagnostic for the probes). */
  adoptDetail: string | null;
  /** window.lace feature-detection snapshot, recorded at boot by the guest
   * app (ADR 41 capability handshake). */
  lace?: {
    injected: boolean;
    version: string | null;
    capabilities: readonly string[];
  };
};

type GuestWindow = Window & {
  __guestBoot?: GuestBootState;
  __laceShellGuest?: {
    controlledAtStart?: boolean;
    controllerAtStart?: ServiceWorker | null;
  };
};

/** Explicit LOADING window — stands in for the real app's boot work. */
const LOADING_MS = 800;
/** Bound on the network-first release.json fetch (never blocks loading). */
const RELEASE_FETCH_TIMEOUT_MS = 4000;
/** Bound on holding the loading phase while adopting a mismatched release. */
const ADOPT_TIMEOUT_MS = 8000;
/** After an update check finds nothing, how long to still allow a racing
 * (register()-triggered) update's controllerchange to land before giving
 * up on adoption. */
const NO_UPDATE_GRACE_MS = 1500;

const RELOADED_FOR_KEY = 'lace-guest:reloaded-for';
/** One-shot hand-off to the ADOPTED document's static splash: written here,
 * read-and-cleared by the inline first script each guest app's build injects
 * into its index.html. The literal is duplicated there, never imported — that
 * script patches a document, it does not join this bundle. */
const ADOPTING_KEY = 'lace-guest:adopting';
const BOOT_COUNT_KEY = 'lace-guest:boot-count';
const STATUS_MESSAGE_TYPE = 'lace-shell-guest:status';

const state: GuestBootState = {
  // Stamped by startBoot, which runs before anything reads the state.
  version: '',
  phase: 'loading',
  releaseCheck: 'pending',
  reloadedFor: [],
  controlledAtStart: false,
  swReady: false,
  bootCount: 0,
  adoptDetail: null,
};

const internal = {
  didControllerChange: false,
  didLoadingWindowElapse: false,
  isAdopting: false,
  /** Resolves once register() settled (null = no SW available/failed). */
  registrationReady: null as Promise<ServiceWorkerRegistration | null> | null,
};

const listeners = new Set<() => void>();

export const subscribeToBoot = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getBootPhase = (): BootPhase => state.phase;

/** Post the boot status to the embedding parent (host.html / offscreen
 * pre-warm / hostile embedder — non-secret data by design). */
const postBootStatus = (): void => {
  if (window.parent === window) return;
  const parentOrigin = location.ancestorOrigins?.[0];
  if (!parentOrigin) return;
  window.parent.postMessage(
    {
      type: STATUS_MESSAGE_TYPE,
      version: state.version,
      phase: state.phase,
      releaseCheck: state.releaseCheck,
      swReady: state.swReady,
      controlled: navigator.serviceWorker?.controller !== null,
      bootCount: state.bootCount,
    },
    parentOrigin,
  );
};

const notify = (): void => {
  for (const listener of listeners) listener();
  postBootStatus();
};

const finishLoadingIfReady = (): void => {
  if (
    state.phase !== 'loading' ||
    internal.isAdopting ||
    !internal.didLoadingWindowElapse
  ) {
    return;
  }
  state.phase = 'interactive';
  notify();
};

const registerServiceWorker =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      internal.didControllerChange = true;
    });
    let registration: ServiceWorkerRegistration | null = null;
    try {
      // RELATIVE, never '/sw.js': each release tree carries its own worker at
      // /<dir>/sw.js (ADR 54 Layout A), so the registration must resolve
      // inside the tree this document was served from. Its scope is then that
      // directory, which is also what keeps the root /release.json — the one
      // mutable document — structurally outside every worker's reach.
      registration = await navigator.serviceWorker.register('./sw.js');
    } catch {
      // Dev server without a built SW, or persistence unavailable (a prompt
      // surface may disable it — ADR 35): boot continues network-only.
      return null;
    }
    void navigator.serviceWorker.ready.then(() => {
      // Active SW ⇒ install (precache) completed — the warm signal the host's
      // offscreen pre-warm waits for.
      state.swReady = true;
      notify();
    });
    return registration;
  };

/** One `{ version, dir }` entry of the pointer; `null` when the value is not a
 * usable release reference. `dir` is held to the contract's `isReleaseDirectory` —
 * the same rule the host applies to the same document, so a directory the host
 * refuses to mount is never one this boot navigates to. */
const parseReleaseEntry = (
  value: unknown,
): { version: string; dir: string } | null => {
  if (typeof value !== 'object' || value === null) return null;
  const { version, dir } = value as { version?: unknown; dir?: unknown };
  return typeof version === 'string' &&
    version.length > 0 &&
    isReleaseDirectory(dir)
    ? { version, dir }
    : null;
};

/** Shape-validate a fetched /release.json body. `null` means "no usable
 * manifest" — indistinguishable, by design, from an unreachable release.json:
 * both leave the cached build in place, so a mangled pointer can never brick a
 * boot. Unknown fields are IGNORED rather than refused: the pointer is
 * operator-owned CD state (ADR 54) that may carry fields this build predates,
 * and refusing those would turn a forward-compatible pointer into an outage. */
export const parseReleaseManifest = (body: unknown): ReleaseManifest | null => {
  if (typeof body !== 'object' || body === null) return null;
  const { current, previous } = body as {
    current?: unknown;
    previous?: unknown;
  };
  const currentEntry = parseReleaseEntry(current);
  const previousEntry = parseReleaseEntry(previous);
  if (currentEntry === null || previousEntry === null) return null;
  const { rolloutPercent } = current as { rolloutPercent?: unknown };
  if (typeof rolloutPercent !== 'number' || !Number.isFinite(rolloutPercent)) {
    return null;
  }
  return {
    current: { ...currentEntry, rolloutPercent },
    previous: previousEntry,
  };
};

const INSTALL_ID_KEY = 'lace-guest:install-id';

/** The id this boot's release cohort is drawn from (ADR 54).
 *
 * PREFERS the one the host hands over on the mount URL's fragment
 * (`/<dir>/#iid=<id>`). ADR 54 gives the HOST the cohort decision — it mounts
 * the directory that decision names, and its offscreen pre-warm warms that same
 * directory — so hashing a different id here would let a ramp mount one tree
 * while this boot pins another, costing a navigation and the pre-warmed cache.
 * A fragment, so the id never rides a request or an access log. It is
 * deliberately NEVER persisted: the host re-sends it on every mount, and a
 * stored copy would fork the two ids the moment the host's changed.
 *
 * Falls back to a guest-origin localStorage id when no host handed one over
 * (direct navigation, dev, tests): boot runs pre-React and may be offline, so
 * the cohort must stay decidable with no round-trip. Losing that id (site data
 * cleared) re-draws the cohort, which changes WHICH served release this install
 * lands on, never whether it has one. Storage refused: `fallbackId`, which must
 * be stable across this client's boots (the baked build version is) or the
 * cohort flaps per boot. */
export const readInstallId = (fallbackId: string): string => {
  const handedOver = new URLSearchParams(location.hash.slice(1)).get('iid');
  if (handedOver !== null && handedOver.length > 0) return handedOver;
  try {
    const stored = localStorage.getItem(INSTALL_ID_KEY);
    if (stored !== null && stored.length > 0) return stored;
    const minted = crypto.randomUUID();
    localStorage.setItem(INSTALL_ID_KEY, minted);
    return minted;
  } catch {
    return fallbackId;
  }
};

const fetchRelease = async (): Promise<ReleaseManifest | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, RELEASE_FETCH_TIMEOUT_MS);
  try {
    // ROOT-ABSOLUTE, never relative: the pointer lives at the ORIGIN root,
    // one level above every release tree, and this document is served from
    // inside one (ADR 54 Layout A) — a relative fetch would ask its own tree
    // for a document that is deliberately not there.
    // Network-first: 'no-store' bypasses the HTTP cache, and the root pointer
    // is outside this worker's scope as well as out of its precache
    // (ADR 54), so the request always reaches the network. Offline ⇒ rejects.
    const response = await fetch('/release.json', {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return parseReleaseManifest(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** The whole adoption decision, kept pure so it is testable without a DOM.
 * Branch order is load-bearing: mid-session never reloads (ADR 54) even when
 * the anti-loop guard would also have stopped it. */
export const decideReleaseCheck = ({
  release,
  installId,
  bakedVersion,
  phase,
  reloadedFor,
}: {
  release: ReleaseManifest | null;
  installId: string;
  bakedVersion: string;
  phase: BootPhase;
  reloadedFor: readonly string[];
}): ReleaseCheckDecision => {
  // Offline / unreachable / malformed — the offline-first boot proceeds on
  // the cached build; never blocks or reloads.
  if (release === null) return { adopt: false, status: 'error' };
  // Both named releases are served concurrently, so the comparison is against
  // the one THIS install pins, not against a single "latest" (ADR 54): an
  // install outside the rollout cohort belongs on `previous` and must adopt it
  // even while a newer `current` is being served to others.
  const selected = selectRelease(release, installId);
  // Equality, not an ordering: a rollback re-points release.json at an OLDER
  // release, which a strictly-newer client would refuse — so adoption keys on
  // ANY mismatch, in both directions.
  if (selected.version === bakedVersion) {
    return { adopt: false, status: 'current' };
  }
  // Mismatch observed AFTER loading ended — NEVER reload mid-session; it is
  // adopted on the next open (ADR 54).
  if (phase !== 'loading') return { adopt: false, status: 'stale-mismatch' };
  // Anti-loop guard: this tab already self-reloaded for that version and
  // still runs a different build (the named build is not being served yet).
  // A SET, not the last version alone: adopt-on-mismatch would otherwise
  // ping-pong forever between two alternately-served versions.
  if (reloadedFor.includes(selected.version)) {
    return { adopt: false, status: 'already-reloaded' };
  }
  return { adopt: true, ...selected };
};

/** Resolve true once an updated SW has taken control (controllerchange) —
 * including an update the browser already applied earlier in this boot
 * (register() itself triggers an update check). False when no updated
 * worker exists or takes control within ADOPT_TIMEOUT_MS. The whole wait —
 * including waiting for register() to settle, which can lose the race
 * against the (fast) release fetch — is bounded by that one timeout. */
const workerStates = (registration: ServiceWorkerRegistration | null): string =>
  registration === null
    ? 'registration=null'
    : `installing=${registration.installing?.state ?? null} waiting=${
        registration.waiting?.state ?? null
      } active=${registration.active?.state ?? null} controller=${
        navigator.serviceWorker.controller?.state ?? null
      }`;

const waitForUpdatedWorker = async (): Promise<boolean> =>
  new Promise<boolean>(resolve => {
    const settled = { done: false };
    let lastRegistration: ServiceWorkerRegistration | null = null;
    const settle = (didUpdate: boolean, detail: string): void => {
      if (settled.done) return;
      settled.done = true;
      state.adoptDetail = `${detail}; ${workerStates(lastRegistration)}`;
      resolve(didUpdate);
    };
    setTimeout(() => {
      settle(false, 'adopt-wait timeout');
    }, ADOPT_TIMEOUT_MS);
    if (!('serviceWorker' in navigator)) {
      settle(false, 'no serviceWorker API');
      return;
    }
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        settle(true, 'controllerchange');
      },
      { once: true },
    );
    if (internal.didControllerChange) {
      settle(true, 'controller already changed this boot');
      return;
    }
    void (internal.registrationReady ?? Promise.resolve(null)).then(
      registration => {
        lastRegistration = registration;
        if (settled.done) return;
        if (registration === null) {
          settle(false, 'register() failed/unavailable');
          return;
        }
        // register() itself triggers an update check, which can race this
        // explicit one: the new worker may already have installed AND
        // activated (skipWaiting) by the time update() resolves, with its
        // clients.claim() controllerchange not yet dispatched to this page.
        // Track the active-worker identity so "no installing/waiting" is
        // not mistaken for "no update exists".
        const activeBefore = registration.active;
        void registration.update().then(
          () => {
            if (settled.done || internal.didControllerChange) return;
            // A new worker is installing/waiting (skipWaiting + clientsClaim
            // will fire controllerchange), or already swapped in as active
            // (claim imminent) — keep waiting; the timeout bounds it.
            if (registration.installing || registration.waiting) return;
            if (registration.active !== activeBefore) return;
            // Nothing found and the active worker never changed: allow a
            // short grace for a racing check's controllerchange to land,
            // then conclude there is nothing to adopt (e.g. release.json
            // points at a version whose build is not being served yet).
            setTimeout(() => {
              settle(false, 'update() found no new worker');
            }, NO_UPDATE_GRACE_MS);
          },
          (error: unknown) => {
            settle(false, `update() rejected: ${String(error)}`);
          },
        );
      },
    );
  });

/** Where adopting a release navigates: the entry document of its tree (ADR 54
 * Layout A serves each release self-contained under one origin-root directory
 * — `isReleaseDirectory` at parse time is what makes `dir` a single segment), with
 * the mount's fragment carried forward. That fragment holds the host's install
 * id, and a self-navigation has no host to re-hand it: dropping it would let
 * the boot that lands there re-draw its own cohort and bounce back. */
export const releaseEntryUrl = (
  base: string,
  releaseDirectory: string,
  hash: string,
): string => `${new URL(`/${releaseDirectory}/`, base).href}${hash}`;

const loadRelease = (version: string, entryUrl: string): void => {
  state.reloadedFor = [...state.reloadedFor, version];
  sessionStorage.setItem(RELOADED_FOR_KEY, JSON.stringify(state.reloadedFor));
  // Before the navigation, never after: the document that reads this key is
  // the one this call is about to load.
  sessionStorage.setItem(ADOPTING_KEY, version);
  state.releaseCheck = 'reloading';
  notify();
  // replace(), not assign(): the superseded build must not sit in the
  // embedding tab's session history as a Back target.
  location.replace(entryUrl);
};

const runReleaseCheck = async (): Promise<void> => {
  const decision = decideReleaseCheck({
    release: await fetchRelease(),
    installId: readInstallId(state.version),
    bakedVersion: state.version,
    phase: state.phase,
    reloadedFor: state.reloadedFor,
  });
  if (!decision.adopt) {
    state.releaseCheck = decision.status;
    notify();
    return;
  }
  internal.isAdopting = true; // holds the loading phase open
  state.releaseCheck = 'adopting';
  notify();
  const entryUrl = releaseEntryUrl(location.href, decision.dir, location.hash);
  // Compared as TREES, not URLs — the fragment rides on the target but says
  // nothing about which tree is loaded. A different tree is a different SW
  // scope: nothing in this document's registration can serve it, so adoption
  // is the navigation itself.
  if (new URL(entryUrl).pathname !== new URL('./', location.href).pathname) {
    loadRelease(decision.version, entryUrl);
    return;
  }
  // Same tree, different version — its worker is what has to change hands
  // first, or the load re-serves the very build being replaced.
  const didUpdate = await waitForUpdatedWorker();
  if (didUpdate && state.phase === 'loading') {
    loadRelease(decision.version, entryUrl);
    return;
  }
  internal.isAdopting = false;
  state.releaseCheck = 'adopt-timeout';
  notify();
  finishLoadingIfReady(); // the loading timer may have fired during the hold
};

/** Read the persisted reloaded-for set; anything unexpected — including a
 * stale single-string value from before the set shape — reads as empty. */
const readReloadedFor = (): readonly string[] => {
  try {
    const parsed: unknown = JSON.parse(
      sessionStorage.getItem(RELOADED_FOR_KEY) ?? '[]',
    );
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

/** Start the offline-first boot. Call once, before the first render, with the
 * build version baked into THIS bundle — the value every release decision is
 * compared against, so it must be the one the serving tree is named for. */
export const startBoot = ({ buildVersion }: { buildVersion: string }): void => {
  const guestWindow = window as GuestWindow;

  state.version = buildVersion;
  const bootCount = Number(sessionStorage.getItem(BOOT_COUNT_KEY) ?? '0') + 1;
  sessionStorage.setItem(BOOT_COUNT_KEY, String(bootCount));
  state.bootCount = bootCount;
  state.reloadedFor = readReloadedFor();
  // Snapshotted by the index.html inline hook at the document's FIRST script,
  // before this module (or anything else) could register a service worker.
  state.controlledAtStart =
    guestWindow.__laceShellGuest?.controlledAtStart ??
    ('serviceWorker' in navigator &&
      navigator.serviceWorker.controller !== null);
  // An updated SW may have claimed this page between document start and this
  // module executing (a racing update check) — compare controller identity
  // against the first-script snapshot so the adoption wait counts it.
  if (
    'serviceWorker' in navigator &&
    guestWindow.__laceShellGuest &&
    'controllerAtStart' in guestWindow.__laceShellGuest &&
    guestWindow.__laceShellGuest.controllerAtStart !==
      navigator.serviceWorker.controller
  ) {
    internal.didControllerChange = true;
  }

  // Live reference — probes read window.__guestBoot.* at any time.
  guestWindow.__guestBoot = state;

  internal.registrationReady = registerServiceWorker();
  void runReleaseCheck();
  setTimeout(() => {
    internal.didLoadingWindowElapse = true;
    finishLoadingIfReady();
  }, LOADING_MS);
  postBootStatus();
};
