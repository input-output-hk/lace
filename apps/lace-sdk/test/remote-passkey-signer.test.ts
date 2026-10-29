import { describe, expect, it, vi } from 'vitest';

import { createRemotePasskeySigner } from '../src/remote-passkey-signer';

type FakeSignerClient = {
  open: () => Window;
  connect: () => Promise<void>;
  request: () => Promise<unknown>;
  close: () => void;
};

const fixture = vi.hoisted(() => {
  const cardanoVaultModule = { moduleName: 'remote-cardano-vault' };
  return {
    cardanoVaultModule,
    createRemoteCardanoVaultModule: vi.fn(
      (_props: { client: FakeSignerClient }) => cardanoVaultModule,
    ),
  };
});

vi.mock('../src/remote-cardano-vault-module', () => ({
  createRemoteCardanoVaultModule: fixture.createRemoteCardanoVaultModule,
}));

type Listener = (event: MessageEvent) => void;

/** Enough of a `Window` for the real signer client to open a popup and attach its handshake listener. */
const createFakeHost = () => {
  const listeners = new Set<Listener>();
  const popup = { closed: false, close: vi.fn(), postMessage: vi.fn() };
  return {
    addEventListener: vi.fn((_type: string, listener: Listener) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: Listener) => {
      listeners.delete(listener);
    }),
    open: vi.fn(() => popup),
  } as unknown as Window;
};

const SIGNER_URL = 'https://signer.example/';

describe('createRemotePasskeySigner', () => {
  it('wires the Cardano vault module to the signer client it exposes', () => {
    const signer = createRemotePasskeySigner({
      signerUrl: SIGNER_URL,
      host: createFakeHost(),
    });

    expect(fixture.createRemoteCardanoVaultModule).toHaveBeenCalledTimes(1);
    const [{ client }] = fixture.createRemoteCardanoVaultModule.mock.calls[0];

    expect(Object.keys(signer).sort()).toEqual([
      'accountPublicKey',
      'cardanoVaultModule',
      'close',
      'connect',
      'open',
      'request',
    ]);
    expect(signer.cardanoVaultModule).toBe(fixture.cardanoVaultModule);
    expect(signer.open).toBe(client.open);
    expect(signer.connect).toBe(client.connect);
    expect(signer.close).toBe(client.close);
    expect(signer.request).toBe(client.request);
  });

  it('opens the popup on the host it was given', () => {
    const host = createFakeHost();

    const signer = createRemotePasskeySigner({ signerUrl: SIGNER_URL, host });
    signer.open();

    expect(host.open).toHaveBeenCalledWith(
      SIGNER_URL,
      'lace-signer',
      expect.any(String),
    );
  });

  it('requests the account public key on the signer connection', async () => {
    const signer = createRemotePasskeySigner({
      signerUrl: SIGNER_URL,
      host: createFakeHost(),
    });

    await expect(signer.accountPublicKey(0)).rejects.toThrow(
      'The signer is not connected.',
    );
  });

  it('rejects connect called before open with a clear error', async () => {
    const signer = createRemotePasskeySigner({
      signerUrl: SIGNER_URL,
      host: createFakeHost(),
    });

    await expect(signer.connect()).rejects.toThrow(
      'The signer popup is not open.',
    );
  });
});
