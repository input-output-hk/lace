import {
  AccAddress,
  AccountContractMissingError,
  CeremonyCancelledError,
  EncryptionKeyMismatchError,
  TokenColor,
} from '@lace-contract/passport';
import { x25519 } from '@noble/curves/ed25519.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sealDeviceEnvelope } from '../../src/acc/envelopes';
import { readShieldedHoldings } from '../../src/flows/holdings';

import type * as InboxWalk from '../../src/acc/inbox-walk';
import type { InboxWalkProps } from '../../src/acc/inbox-walk';
import type { FlowContext } from '../../src/flows/types';
import type {
  OpenedInboxEntry,
  PassportAccountInfo,
  PassportAuthoriser,
  PassportEncryptionKey,
  ShieldedCoin,
} from '@lace-contract/passport';

const mocks = vi.hoisted(() => ({
  createIndexerClient: vi.fn(),
  ledger: vi.fn(),
  walkInbox: vi.fn(),
}));

vi.mock('../../src/infra/indexer', () => ({
  createIndexerClient: mocks.createIndexerClient,
}));
vi.mock('../../src/acc/acc-module', () => ({
  ledger: mocks.ledger,
}));
vi.mock('../../src/acc/inbox-walk', async importOriginal => ({
  ...(await importOriginal<typeof InboxWalk>()),
  walkInbox: mocks.walkInbox,
}));

const accountAddress = 'ac'.repeat(32);
const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const account: PassportAccountInfo = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  status: 'ready',
  networkId: 'undeployed',
};
const contractState = { data: 'charged-state' };
const encKey = new Uint8Array(32).fill(7);
const readerPublicKey = x25519.getPublicKey(x25519.utils.randomSecretKey());
const envelope = await sealDeviceEnvelope(readerPublicKey, {
  secret: new Uint8Array(32).fill(3),
  rosterKey: new Uint8Array(32).fill(4),
});
const otherEnvelope = await sealDeviceEnvelope(
  x25519.getPublicKey(x25519.utils.randomSecretKey()),
  { secret: new Uint8Array(32).fill(5), rosterKey: new Uint8Array(32).fill(6) },
);
const inbox = [envelope, otherEnvelope];
const ledgerState = {
  tag: 'decoded-ledger-state',
  inbox_count: BigInt(inbox.length),
  inbox: {
    member: (ordinal: bigint) => ordinal < BigInt(inbox.length),
    lookup: (ordinal: bigint) => inbox[Number(ordinal)],
  },
  enc_key: encKey,
};
const entries = [new Uint8Array(192).fill(1), new Uint8Array(192).fill(2)];
const coin: ShieldedCoin = {
  nonce: new Uint8Array(32),
  color: new Uint8Array(32),
  value: 5n,
};
const opened: (OpenedInboxEntry | null)[] = [
  { kind: 'coin', coin },
  {
    kind: 'device',
    device: {
      readerPublicKey: '11'.repeat(32),
      devicePublicKey: '22'.repeat(32),
    },
  },
];
const walked = {
  holdings: [
    {
      color: TokenColor('00'.repeat(32)),
      value: '5',
      commitment: 'ab'.repeat(32),
      index: 7,
    },
  ],
  holdingEntries: [entries[0]],
  skippedEntries: 1,
};

const createContext = () => {
  const events: string[] = [];
  const withKeySession = vi.fn(
    async (operation: () => Promise<unknown>, flow?: unknown) => {
      events.push(`open ${JSON.stringify(flow)}`);
      try {
        return await operation();
      } finally {
        events.push('close');
      }
    },
  );
  const authoriser = {
    scheme: 'jubjub-schnorr' as const,
    devicePublicKey: vi.fn(),
    deviceCommitment: vi.fn(),
    authorise: vi.fn(),
    withKeySession: withKeySession as PassportAuthoriser['withKeySession'],
  };
  const encryptionKey = {
    readerPublicKey: vi.fn<PassportEncryptionKey['readerPublicKey']>(
      async () => {
        events.push('reader-public-key');
        return readerPublicKey;
      },
    ),
    createKeys: vi.fn(),
    sealToDevice: vi.fn(),
    sealGrant: vi.fn(),
    openInbox: vi.fn<PassportEncryptionKey['openInbox']>(async () => {
      events.push('open-inbox');
      return opened;
    }),
  };
  const context: FlowContext = {
    seams: {
      passportAuthoriser: authoriser,
      passportEncryptionKey: encryptionKey,
      passportSponsor: { balanceAndSign: vi.fn() },
      passportProver: { prove: vi.fn(), check: vi.fn() },
      passportNetwork: network,
    },
    accountRecords: { read: vi.fn(), write: vi.fn(), presence: vi.fn() },
    onProgress: vi.fn(),
    rpId: 'lace.io',
  };
  return { context, events, withKeySession, encryptionKey };
};

const indexer = {
  queryContractState: vi.fn(async () => contractState),
  queryShieldedEvents: vi.fn(),
};

/** The opener the flow handed the walk, exercised as the walk would. */
const openerOf = (): InboxWalkProps['openEntries'] => {
  const [props] = mocks.walkInbox.mock.calls[0] as unknown as [InboxWalkProps];
  return props.openEntries;
};

describe('readShieldedHoldings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexer.queryContractState.mockResolvedValue(contractState);
    mocks.createIndexerClient.mockReturnValue(indexer);
    mocks.ledger.mockReturnValue(ledgerState);
    mocks.walkInbox.mockResolvedValue(walked);
  });

  it('walks the inbox of the account from live ledger state through a fresh indexer client', async () => {
    const { context } = createContext();

    await expect(readShieldedHoldings({ account }, context)).resolves.toEqual({
      holdings: walked.holdings,
      skippedEntries: walked.skippedEntries,
    });

    expect(mocks.createIndexerClient).toHaveBeenCalledExactlyOnceWith({
      indexerUrl: network.indexerUrl,
      indexerWsUrl: network.indexerWsUrl,
    });
    expect(indexer.queryContractState).toHaveBeenCalledExactlyOnceWith(
      accountAddress,
    );
    expect(mocks.ledger).toHaveBeenCalledExactlyOnceWith(contractState.data);
    expect(mocks.walkInbox).toHaveBeenCalledExactlyOnceWith({
      address: accountAddress,
      ledgerState,
      indexer: expect.objectContaining({
        queryShieldedEvents: indexer.queryShieldedEvents,
      }) as unknown,
      openEntries: expect.any(Function) as unknown,
    });
  });

  it('opens the entries with the keyring of the ledger enc_key and this device envelopes alone, answering coins only', async () => {
    const { context, encryptionKey } = createContext();
    await readShieldedHoldings({ account }, context);

    await expect(openerOf()(entries)).resolves.toEqual([coin, null]);

    expect(encryptionKey.readerPublicKey).toHaveBeenCalledExactlyOnceWith(
      network.networkId,
    );
    expect(encryptionKey.openInbox).toHaveBeenCalledExactlyOnceWith(
      network.networkId,
      { account: AccAddress(accountAddress), encKey, envelopes: [envelope] },
      entries,
    );
  });

  it('passes a keyring refusal through rather than read the inbox as empty', async () => {
    const { context, encryptionKey } = createContext();
    encryptionKey.openInbox.mockRejectedValue(new EncryptionKeyMismatchError());
    await readShieldedHoldings({ account }, context);

    await expect(openerOf()(entries)).rejects.toBeInstanceOf(
      EncryptionKeyMismatchError,
    );
  });

  it('opens the entries inside one read-holdings key session, on the network the account lives on', async () => {
    const { context, events, encryptionKey } = createContext();
    await readShieldedHoldings({ account }, context);

    await expect(openerOf()(entries)).resolves.toEqual([coin, null]);

    expect(encryptionKey.openInbox).toHaveBeenCalledOnce();
    expect(events).toEqual([
      'open {"kind":"read-holdings"}',
      'reader-public-key',
      'open-inbox',
      'close',
    ]);
  });

  it('opens no key session until the walk asks for entries', async () => {
    const { context, withKeySession } = createContext();

    await readShieldedHoldings({ account }, context);

    expect(withKeySession).not.toHaveBeenCalled();
  });

  it('opens the entries directly when the authoriser has no key session', async () => {
    const { context, encryptionKey } = createContext();
    delete context.seams.passportAuthoriser.withKeySession;
    await readShieldedHoldings({ account }, context);

    await expect(openerOf()(entries)).resolves.toEqual([coin, null]);

    expect(encryptionKey.openInbox).toHaveBeenCalledOnce();
  });

  it('rejects with AccountContractMissingError when the address holds no live contract', async () => {
    indexer.queryContractState.mockResolvedValue(null as never);
    const { context } = createContext();

    await expect(
      readShieldedHoldings({ account }, context),
    ).rejects.toBeInstanceOf(AccountContractMissingError);
    expect(mocks.walkInbox).not.toHaveBeenCalled();
  });

  it('passes a dismissed ceremony through from the opener', async () => {
    const { context, encryptionKey } = createContext();
    encryptionKey.openInbox.mockRejectedValue(new CeremonyCancelledError());
    await readShieldedHoldings({ account }, context);

    await expect(openerOf()(entries)).rejects.toBeInstanceOf(
      CeremonyCancelledError,
    );
  });

  it('reports no stage and writes nothing', async () => {
    const { context } = createContext();

    await readShieldedHoldings({ account }, context);

    expect(context.onProgress).not.toHaveBeenCalled();
    expect(context.accountRecords.write).not.toHaveBeenCalled();
    expect(context.accountRecords.read).not.toHaveBeenCalled();
  });
});
