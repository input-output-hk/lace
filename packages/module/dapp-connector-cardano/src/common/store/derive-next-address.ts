import * as Crypto from '@cardano-sdk/crypto';
import { blake2b } from '@cardano-sdk/crypto';
import { AddressType, Bip32Account } from '@cardano-sdk/key-management';
import {
  isCardanoAccount,
  toContractAddress,
} from '@lace-contract/cardano-context';
import { filter, firstValueFrom } from 'rxjs';

import { APIError, APIErrorCode } from '../api-error';

import type { DeriveNextUnusedAddressFunction } from './dependencies/cardano-dapp-connector-api';
import type {
  AnyAddress,
  UpsertAddressesPayload,
} from '@lace-contract/addresses';
import type { CardanoAddressData } from '@lace-contract/cardano-context';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

type CreateDeriveNextAddressParams = {
  selectAccounts$: Observable<AnyAccount[]>;
  selectAllAddresses$: Observable<AnyAddress[]>;
  upsertAddresses: (payload: UpsertAddressesPayload) => void;
};

export const createDeriveNextAddress = ({
  selectAccounts$,
  selectAllAddresses$,
  upsertAddresses,
}: CreateDeriveNextAddressParams): DeriveNextUnusedAddressFunction => {
  return async accountId => {
    const [allAccounts, allAddresses] = await Promise.all([
      firstValueFrom(selectAccounts$),
      firstValueFrom(selectAllAddresses$),
    ]);

    const account = allAccounts.find(a => a.accountId === accountId);
    if (!account || !isCardanoAccount(account)) {
      throw new APIError(
        APIErrorCode.InternalError,
        `Cardano account not found for ID: ${accountId}`,
      );
    }
    if (account.accountType === 'MultiSig') {
      throw new APIError(
        APIErrorCode.InternalError,
        `Cannot derive address for MultiSig account: ${accountId}`,
      );
    }

    const accountExternalAddresses = allAddresses.filter(
      (a): a is AnyAddress<CardanoAddressData> =>
        a.accountId === accountId &&
        a.blockchainName === 'Cardano' &&
        (a as AnyAddress<CardanoAddressData>).data?.type ===
          AddressType.External,
    );
    if (accountExternalAddresses.length === 0) {
      throw new APIError(
        APIErrorCode.InternalError,
        `No External addresses found for account: ${accountId}`,
      );
    }

    const maxIndex = accountExternalAddresses.reduce(
      (max, addr) => Math.max(max, addr.data?.index ?? 0),
      0,
    );

    const { accountIndex, extendedAccountPublicKey, chainId } =
      account.blockchainSpecific;

    const bip32Ed25519 = await Crypto.SodiumBip32Ed25519.create();
    const bip32Account = new Bip32Account(
      { extendedAccountPublicKey, accountIndex, chainId },
      { blake2b, bip32Ed25519 },
    );
    const newGroupedAddress = await bip32Account.deriveAddress(
      { type: AddressType.External, index: maxIndex + 1 },
      0,
    );
    const newAddress = toContractAddress(
      newGroupedAddress,
      chainId.networkMagic,
    );

    upsertAddresses({
      blockchainName: 'Cardano',
      accountId,
      addresses: [newAddress],
    });

    await firstValueFrom(
      selectAllAddresses$.pipe(
        filter(list =>
          list.some(
            a => a.address === newAddress.address && a.accountId === accountId,
          ),
        ),
      ),
    );

    return {
      ...newAddress,
      accountId,
      blockchainName: 'Cardano',
    };
  };
};
