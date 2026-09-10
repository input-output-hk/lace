// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  // @ts-expect-error __DEV__ is a React Native global
  globalThis.__DEV__ = false;
});

import {
  defaultConfig,
  generateCip30InjectionScript,
} from '../src/mobile/injection';

const TOKEN = 'unit-bridge-token';

type Envelope = { id: string; token: string; nonce: string; origin: string };

type LaceWindow = typeof window & {
  __LACE_CIP30_CONFIG__?: unknown;
  ReactNativeWebView?: { postMessage: (message: string) => void };
  cardano?: { lace?: { isEnabled: () => Promise<boolean> } };
  laceCip30Response?: (response: unknown) => void;
};

const laceWindow = window as LaceWindow;

const parseEnvelope = (raw: string): Envelope => JSON.parse(raw) as Envelope;

/** Evaluate the injected runtime in this jsdom document and capture postMessage. */
const loadRuntime = (): { posted: string[] } => {
  const posted: string[] = [];
  laceWindow.ReactNativeWebView = {
    postMessage: message => posted.push(message),
  };
  const script = generateCip30InjectionScript({
    ...defaultConfig,
    bridgeToken: TOKEN,
    requestTimeout: 100_000,
  });
  // The runtime is authored as a browser IIFE and shipped as a string; eval is
  // how the WebView would run it. Test-only.

  (0, eval)(script);
  return { posted };
};

/** A fresh document: drop the injected globals so the re-injection guard passes. */
const resetRuntime = (): void => {
  delete laceWindow.cardano;
  delete laceWindow.laceCip30Response;
  delete laceWindow.__LACE_CIP30_CONFIG__;
  delete laceWindow.ReactNativeWebView;
};

describe('cip30 injected runtime', () => {
  beforeEach(() => {
    resetRuntime();
  });
  afterEach(() => {
    resetRuntime();
  });

  it('stamps the bridge token, a document nonce, and the document origin on every envelope', () => {
    const { posted } = loadRuntime();

    void laceWindow.cardano!.lace!.isEnabled();

    expect(posted).toHaveLength(1);
    const envelope = parseEnvelope(posted[0]);
    expect(envelope.token).toBe(TOKEN);
    expect(typeof envelope.nonce).toBe('string');
    expect(envelope.nonce.length).toBeGreaterThan(0);
    expect(envelope.origin).toBe(window.location.origin);
  });

  it('sends through references captured before page scripts, immune to later overrides', () => {
    const { posted } = loadRuntime();

    // A hostile page wraps the send path AFTER the runtime initialized, trying to
    // read the token or rewrite the origin on outgoing envelopes.
    const evilPostMessage = vi.fn();
    laceWindow.ReactNativeWebView!.postMessage = evilPostMessage;
    const realStringify = JSON.stringify;
    JSON.stringify = () =>
      realStringify({
        source: 'lace-cip30',
        origin: 'https://attacker.example',
      });

    try {
      void laceWindow.cardano!.lace!.isEnabled();
    } finally {
      JSON.stringify = realStringify;
    }

    // The wrapper never saw the message, and the envelope kept the real origin and
    // token — built with the pristine references, not the page's overrides.
    expect(evilPostMessage).not.toHaveBeenCalled();
    expect(posted).toHaveLength(1);
    const envelope = parseEnvelope(posted[0]);
    expect(envelope.token).toBe(TOKEN);
    expect(envelope.origin).toBe(window.location.origin);
  });

  it('resolves only a response carrying the matching document nonce', async () => {
    const { posted } = loadRuntime();

    const pending = laceWindow.cardano!.lace!.isEnabled();
    const envelope = parseEnvelope(posted[0]);

    // Wrong nonce → ignored. If it wrongly resolved, isEnabled would settle to
    // false (result:false) and the later correct response would be a no-op.
    laceWindow.laceCip30Response!({
      id: envelope.id,
      success: true,
      result: false,
      nonce: 'a-different-document',
    });

    // Correct nonce → resolves.
    laceWindow.laceCip30Response!({
      id: envelope.id,
      success: true,
      result: true,
      nonce: envelope.nonce,
    });

    await expect(pending).resolves.toBe(true);
  });

  it('gives each freshly-loaded document a distinct nonce', () => {
    const first = loadRuntime();
    void laceWindow.cardano!.lace!.isEnabled();
    const firstNonce = parseEnvelope(first.posted[0]).nonce;

    resetRuntime();

    const second = loadRuntime();
    void laceWindow.cardano!.lace!.isEnabled();
    const secondNonce = parseEnvelope(second.posted[0]).nonce;

    expect(firstNonce).not.toBe(secondNonce);
  });
});
