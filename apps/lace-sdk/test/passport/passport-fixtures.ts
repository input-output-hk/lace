import {
  GrantId,
  GrantScopeSalt,
  GrantSlot,
  TokenColor,
} from '@lace-contract/passport';
import { BehaviorSubject } from 'rxjs';

import type { WalletWithPassport } from '../../src/passport/export-passport-agent-policy';
import type { GrantRecord, PassportAccountInfo } from '@lace-contract/passport';

export const NETWORK = 'undeployed';
export const ACCOUNT_ADDRESS = 'ab'.repeat(32);
export const GRANT_ID = GrantId('11'.repeat(32));
export const GRANTEE_PUBLIC_KEY = '22'.repeat(32);
export const SECP256K1_GRANTEE_PUBLIC_KEY = `02${'22'.repeat(32)}`;
export const SCOPE_SALT = '33'.repeat(32);
export const COLOR = '00'.repeat(32);
export const RECIPIENT_VALUE = '44'.repeat(32);
export const ENC_KEY = 'e1'.repeat(32);

export const account: PassportAccountInfo = {
  address: ACCOUNT_ADDRESS,
  bindingVersion: '0.1.0-lace.1',
  status: 'ready',
  networkId: NETWORK,
};

export const grantRecord = (
  overrides: Partial<GrantRecord> = {},
): GrantRecord => ({
  id: GRANT_ID,
  slot: GrantSlot(2),
  active: true,
  epoch: 0,
  generation: 0,
  issuedAt: 1_800_000_000,
  scope: {
    operations: ['withdraw-unshielded'],
    read: false,
    objectCommit: '55'.repeat(32),
    perCallCap: '100',
    cap: '500',
    expiresAt: 1_900_000_000,
    rpCommit: '66'.repeat(32),
    readPkHash: '00'.repeat(32),
    window: null,
    callerCommit: '00'.repeat(32),
  },
  spentWindow: { start: 0, spent: '0' },
  opening: {
    scopeSalt: GrantScopeSalt(SCOPE_SALT),
    granteeScheme: 'jubjub-schnorr',
    granteePublicKey: GRANTEE_PUBLIC_KEY,
    origin: 'lace.io',
    color: TokenColor(COLOR),
    recipient: { kind: 'user-address', value: RECIPIENT_VALUE },
    maxCoinValue: '300',
  },
  ...overrides,
});

export const walletWith = (
  accountInState: PassportAccountInfo | undefined,
  grants: GrantRecord[],
  /** The enc_key in state; null for a wallet that has not read it yet. */
  encKey: string | null = ENC_KEY,
): WalletWithPassport =>
  ({
    stateObservables: {
      passport: {
        selectAccount$: new BehaviorSubject(accountInState),
        selectGrants$: new BehaviorSubject(grants),
        selectEncKey$: new BehaviorSubject(encKey ?? undefined),
      },
    },
  } as unknown as WalletWithPassport);
