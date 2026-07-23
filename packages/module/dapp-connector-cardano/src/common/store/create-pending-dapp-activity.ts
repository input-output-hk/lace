import { Serialization } from '@cardano-sdk/core';
import { derivePendingActivityFromCbor } from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-lib/util';

import type { Cardano } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountUtxoMap,
  CardanoPaymentAddress,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';

type CreatePendingDappActivityParams = {
  serializedTx: string;
  accountIdHint?: AccountId;
  accountUtxos: AccountUtxoMap;
  allAddresses: readonly AnyAddress[];
};

const cardanoAddressesForAccount = (
  allAddresses: readonly AnyAddress[],
  accountId: AccountId,
): CardanoPaymentAddress[] =>
  allAddresses
    .filter(
      addr => addr.accountId === accountId && addr.blockchainName === 'Cardano',
    )
    .map(addr => addr.address as unknown as CardanoPaymentAddress);

const findAccountIdByTxInputs = (
  serializedTx: string,
  accountUtxos: AccountUtxoMap,
): AccountId | undefined => {
  const core = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(serializedTx),
  ).toCore();

  const inputOutpoints = new Set(
    core.body.inputs.map(input => `${input.txId}#${input.index}`),
  );

  for (const accountId of Object.keys(accountUtxos) as AccountId[]) {
    const utxos: Cardano.Utxo[] = accountUtxos[accountId] ?? [];
    const hasOwnInput = utxos.some(([utxoIn]) =>
      inputOutpoints.has(`${utxoIn.txId}#${utxoIn.index}`),
    );
    if (hasOwnInput) return accountId;
  }

  return undefined;
};

export const createPendingDappActivity = ({
  serializedTx,
  accountIdHint,
  accountUtxos,
  allAddresses,
}: CreatePendingDappActivityParams): Activity | undefined => {
  const accountId =
    accountIdHint ?? findAccountIdByTxInputs(serializedTx, accountUtxos);
  if (!accountId) return undefined;

  return derivePendingActivityFromCbor({
    serializedTx: HexBytes(serializedTx),
    accountId,
    accountAddresses: cardanoAddressesForAccount(allAddresses, accountId),
    accountUtxos: accountUtxos[accountId] ?? [],
  });
};
