import { describe, expect, it } from 'vitest';

import {
  hasMessageType,
  isSignerRequest,
  isSignerResponse,
} from '../../src/remote/protocol';

import type { SignerRequest } from '../../src/remote/protocol';
import type { SignerFlow } from '../../src/remote/protocol-extensions';

const GRANT_ID = 'ab'.repeat(32);

/**
 * The descriptors of the three grant flows as the Passport module sends
 * them; the library carries the scope opaque.
 */
const GRANT_FLOWS: SignerFlow[] = [
  {
    kind: 'issue-grant',
    account: 'ac'.repeat(32),
    grantId: GRANT_ID,
    scope: { operations: ['withdraw-unshielded'], cap: '450' },
    slot: 0,
    scopeSalt: '22'.repeat(32),
    scopeDigest: 'cd'.repeat(32),
  },
  { kind: 'revoke-grant', grantId: GRANT_ID },
  { kind: 'revoke-all-grants' },
];

describe('signer protocol guards', () => {
  it.each(GRANT_FLOWS)(
    'recognises a flow-open carrying the $kind descriptor as a request',
    flow => {
      const request: SignerRequest<'flow-open'> = {
        id: 1,
        kind: 'flow-open',
        payload: { flow },
      };

      expect(isSignerRequest(request)).toBe(true);
      expect(isSignerResponse(request)).toBe(false);
    },
  );

  it('recognises a flow-open carrying the read-holdings descriptor, and an open-inbox request', () => {
    expect(
      isSignerRequest({
        id: 2,
        kind: 'flow-open',
        payload: { flow: { kind: 'read-holdings' } },
      }),
    ).toBe(true);
    expect(
      isSignerRequest({
        id: 3,
        kind: 'open-inbox',
        payload: {
          networkId: 'undeployed',
          keyring: { encKey: '07'.repeat(32), envelopes: [] },
          entries: ['00'.repeat(192)],
        },
      }),
    ).toBe(true);
  });

  it('recognises a flow-open carrying a rotating revoke descriptor, and the rotation requests', () => {
    expect(
      isSignerRequest({
        id: 4,
        kind: 'flow-open',
        payload: { flow: { kind: 'revoke-all-grants', read: true } },
      }),
    ).toBe(true);
    expect(
      isSignerRequest({
        id: 5,
        kind: 'reencrypt-inbox',
        payload: {
          networkId: 'undeployed',
          keyring: { encKey: '07'.repeat(32), envelopes: [] },
          to: '09'.repeat(32),
          entries: ['00'.repeat(192)],
        },
      }),
    ).toBe(true);
    expect(
      isSignerRequest({
        id: 6,
        kind: 'seal-view',
        payload: {
          networkId: 'undeployed',
          keyring: { encKey: '07'.repeat(32), envelopes: [] },
          grantId: 'ab'.repeat(32),
          account: 'cd'.repeat(32),
          readPublicKey: 'ef'.repeat(32),
        },
      }),
    ).toBe(true);
  });

  it('recognises a flow-open of a removal naming the devices that keep reading', () => {
    expect(
      isSignerRequest({
        id: 6,
        kind: 'flow-open',
        payload: {
          flow: {
            kind: 'remove-device',
            commitmentHex: 'ab'.repeat(32),
            account: 'cd'.repeat(32),
            devices: ['11'.repeat(32)],
          },
        },
      }),
    ).toBe(true);
  });

  it('recognises a flow-open of an install naming the account and its operations', () => {
    expect(
      isSignerRequest({
        id: 6,
        kind: 'flow-open',
        payload: {
          flow: {
            kind: 'install-operations',
            account: 'cd'.repeat(32),
            operations: ['withdraw_unshielded_with_grant_k256'],
          },
        },
      }),
    ).toBe(true);
  });

  it('recognises the account key requests and a flow-open delivering keys to a joining device', () => {
    expect(
      isSignerRequest({
        id: 7,
        kind: 'flow-open',
        payload: {
          flow: {
            kind: 'add-device',
            commitmentHex: 'ab'.repeat(32),
            account: 'cd'.repeat(32),
            reader: {
              readerPublicKey: '12'.repeat(32),
              devicePublicKey: '34'.repeat(32),
            },
          },
        },
      }),
    ).toBe(true);
    for (const kind of [
      'reader-public-key',
      'create-keys',
      'seal-to-device',
      'seal-grant',
    ]) {
      expect(
        isSignerRequest({
          id: 8,
          kind,
          payload: { networkId: 'undeployed' },
        }),
      ).toBe(true);
    }
  });

  it.each([
    null,
    'flow-open',
    { id: '1', kind: 'flow-open', payload: {} },
    { id: 1, payload: {} },
    { id: 1, kind: 'flow-open' },
  ])('refuses %j as a request', data => {
    expect(isSignerRequest(data)).toBe(false);
  });

  it('recognises responses by their id and ok flag', () => {
    expect(isSignerResponse({ id: 1, ok: true, result: GRANT_ID })).toBe(true);
    expect(
      isSignerResponse({ id: 1, ok: false, code: 'flow-scope', message: '' }),
    ).toBe(true);
    expect(isSignerResponse({ id: 1, ok: 'yes' })).toBe(false);
    expect(isSignerResponse({ ok: true })).toBe(false);
  });

  it('recognises window messages by their type tag', () => {
    expect(hasMessageType({ type: 'hello' }, 'hello')).toBe(true);
    expect(hasMessageType({ type: 'ready' }, 'hello')).toBe(false);
    expect(hasMessageType('hello', 'hello')).toBe(false);
  });
});
