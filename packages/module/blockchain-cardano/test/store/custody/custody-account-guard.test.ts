import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { AccountId } from '@lace-contract/wallet-repo';
import { CURRENT_CUSTODY_CONTRACT_VERSION } from '@lace-lib/cardano-custody';
import { describe, expect, it } from 'vitest';

import {
  CardanoCustodyAccountRefusedError,
  refuseCustodyAccount,
} from '../../../src/store/custody/custody-account-guard';

import { custodyAddressEntry } from './custody-address-entry';

import type { Address, AnyAddress } from '@lace-contract/addresses';

const accountId = AccountId('custody-account');
const otherAccountId = AccountId('other-account');

const accountValidator: Cardano.Credential = {
  type: Cardano.CredentialType.ScriptHash,
  hash: CURRENT_CUSTODY_CONTRACT_VERSION.accountValidatorHash,
};
const keyCredential: Cardano.Credential = {
  type: Cardano.CredentialType.KeyHash,
  hash: Hash28ByteBase16('ab'.repeat(28)),
};

const entry = (
  address: Cardano.Address,
  blockchainName: AnyAddress['blockchainName'] = 'Cardano',
): AnyAddress => ({
  accountId,
  address: address.toBech32() as unknown as Address,
  blockchainName,
});

const enterpriseCustodyAddress = Cardano.EnterpriseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  accountValidator,
).toAddress();
const keyAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  keyCredential,
  keyCredential,
).toAddress();

describe('refuseCustodyAccount', () => {
  it('refuses an account with a custody account address', () => {
    expect(() => {
      refuseCustodyAccount(accountId, [custodyAddressEntry(accountId)]);
    }).toThrow(CardanoCustodyAccountRefusedError);
  });

  it('refuses an account with an address that pays the account validator without a stake part', () => {
    expect(() => {
      refuseCustodyAccount(accountId, [entry(enterpriseCustodyAddress)]);
    }).toThrow(CardanoCustodyAccountRefusedError);
  });

  it('allows an account whose addresses pay no custody validator', () => {
    expect(() => {
      refuseCustodyAccount(accountId, [
        entry(keyAddress),
        custodyAddressEntry(otherAccountId),
      ]);
    }).not.toThrow();
  });

  it('ignores addresses of other blockchains', () => {
    expect(() => {
      refuseCustodyAccount(accountId, [
        entry(enterpriseCustodyAddress, 'Bitcoin'),
      ]);
    }).not.toThrow();
  });
});
