import {
  defaultTxTtlLength,
  fromUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-lib/util';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  DustAddress,
  MidnightBech32m,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';
import { of } from 'rxjs';

import type {
  MidnightSDKNetworkId,
  MidnightWallet,
} from '@lace-contract/midnight-context';
import type {
  DustRegistration,
  SignatureEnabled,
  SignatureVerifyingKey,
} from '@midnight-ntwrk/ledger-v8';
import type { UtxoWithMeta } from '@midnightntwrk/wallet-sdk/facade';

type TokenTransferParams = {
  address: string;
  amount: bigint;
  tokenId: TokenId;
};

type ConstructTxParams = {
  networkId: MidnightSDKNetworkId;
  transfers: readonly TokenTransferParams[];
  ttl?: Date;
};

export type DustDesignationDependencies = {
  nightUtxos: UtxoWithMeta[];
  nightVerifyingKey: SignatureVerifyingKey;
};

type ConstructDustDesignationTxParams = DustDesignationDependencies & {
  address: string;
  networkId: MidnightSDKNetworkId;
  ttl?: Date;
  /**
   * The DUST the registration may draw from its NIGHT's generation to pay its
   * own fee; the total NIGHT value by default. The ledger credits it as DUST
   * when the transaction is balanced, so a fee estimate is only as honest as
   * this allowance.
   */
  allowFeePayment?: bigint;
};

export const constructDustDesignationTransaction = ({
  address,
  networkId,
  nightUtxos,
  nightVerifyingKey,
  ttl = new Date(Date.now() + defaultTxTtlLength),
  allowFeePayment,
}: ConstructDustDesignationTxParams) => {
  const parsedAddress = MidnightBech32m.parse(address);
  const receiverData = DustAddress.codec.decode(networkId, parsedAddress).data;
  const currentTime = new Date();
  const intent = ledger.Intent.new(ttl);
  const totalNightValue = nightUtxos
    .map(({ utxo: { value } }) => BigNumber.valueOf(value))
    .reduce((total, value) => total + value, 0n);

  const inputs = nightUtxos.map(({ utxo }) => ({
    ...utxo,
    owner: nightVerifyingKey,
  }));
  const outputs = inputs.map(input => ({
    owner: ledger.addressFromKey(nightVerifyingKey),
    type: input.type,
    value: input.value,
  }));
  intent.guaranteedUnshieldedOffer = ledger.UnshieldedOffer.new(
    inputs,
    outputs,
    [],
  );

  // The constructor widens the signature kind; retain it for the enclosing intent.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const dustRegistration = new ledger.DustRegistration(
    'signature',
    nightVerifyingKey,
    receiverData,
    allowFeePayment ?? totalNightValue,
  ) as DustRegistration<SignatureEnabled>;
  intent.dustActions = new ledger.DustActions(
    'signature' as const,
    'pre-proof' as const,
    currentTime,
    [],
    [dustRegistration],
  );

  return ledger.Transaction.fromParts(networkId, undefined, undefined, intent);
};

export const constructUnshieldedTransaction = ({
  networkId,
  transfers,
  ttl = new Date(Date.now() + defaultTxTtlLength),
}: ConstructTxParams) => {
  const intent = ledger.Intent.new(ttl);
  const outputs = transfers.map(({ address, amount, tokenId }) => ({
    value: amount,
    owner: UnshieldedAddress.codec
      .decode(networkId, MidnightBech32m.parse(address))
      .data.toString('hex'),
    type: tokenId,
  }));
  intent.guaranteedUnshieldedOffer = ledger.UnshieldedOffer.new(
    [],
    outputs,
    [],
  );
  return ledger.Transaction.fromParts(networkId, undefined, undefined, intent);
};

export const constructShieldedTransaction = ({
  networkId,
  transfers,
}: ConstructTxParams) => {
  const toOffer = ({ address, amount, tokenId }: TokenTransferParams) => {
    const decodedAddress = ShieldedAddress.codec.decode(
      networkId,
      MidnightBech32m.parse(address),
    );
    const output = ledger.ZswapOutput.new(
      ledger.createShieldedCoinInfo(tokenId, amount),
      0,
      decodedAddress.coinPublicKey.toHexString(),
      decodedAddress.encryptionPublicKey.toHexString(),
    );
    return ledger.ZswapOffer.fromOutput(output, tokenId, amount);
  };

  const [firstTransfer, ...remainingTransfers] = transfers;
  if (!firstTransfer)
    throw new Error('At least one token transfer is required');
  // ZswapOffer.fromOutput is a singleton constructor by design; merge is the
  // ledger's composition path for multi-token / multi-output offers.
  const offer = remainingTransfers
    .map(toOffer)
    .reduce(
      (merged, singleton) => merged.merge(singleton),
      toOffer(firstTransfer),
    );
  return ledger.Transaction.fromParts(networkId, offer);
};

/** Normalize token-state IDs and reject a batch before any engine operation. */
export const normalizeMidnightTransfers = (
  networkId: MidnightSDKNetworkId,
  kind: 'shielded' | 'unshielded',
  outputs: readonly { to: string; tokenId: string; amount: bigint }[],
): TokenTransferParams[] => {
  if (kind !== 'shielded' && kind !== 'unshielded')
    throw new Error('Unsupported Midnight transfer kind');
  if (outputs.length === 0)
    throw new Error('At least one token transfer is required');
  return outputs.map(({ to, tokenId, amount }) => {
    if (typeof amount !== 'bigint' || amount <= 0n)
      throw new Error('Transfer amount must be a positive bigint');
    const prefix = `unshielded-${networkId}`;
    if (kind === 'unshielded' && !tokenId.startsWith(prefix))
      throw new Error(
        'Unshielded token ID must match the transfer kind and network',
      );
    const raw =
      kind === 'unshielded'
        ? fromUnshieldedTokenType(tokenId, networkId)
        : tokenId;
    if (!/^[0-9a-f]{64}$/.test(raw))
      throw new Error('Invalid token ID or token-kind mismatch');
    const parsed = MidnightBech32m.parse(to);
    if (kind === 'shielded') ShieldedAddress.codec.decode(networkId, parsed);
    else UnshieldedAddress.codec.decode(networkId, parsed);
    return { address: to, tokenId: TokenId(raw), amount };
  });
};

/** Keep designation's zero-fee exception identical in headless and UI preparation. */
export const estimatePreparedMidnightFee = (
  wallet: Pick<
    MidnightWallet,
    'calculateTransactionFee' | 'estimateTransactionFee'
  >,
  tx: Parameters<MidnightWallet['calculateTransactionFee']>[0],
  {
    isDustDesignation,
    dustBalance,
    areKeysAvailable,
  }: {
    isDustDesignation: boolean;
    dustBalance: bigint;
    areKeysAvailable: boolean;
  },
) => {
  if (isDustDesignation && dustBalance === 0n) return of(0n);
  return areKeysAvailable
    ? wallet.estimateTransactionFee(tx, { currentTime: new Date() })
    : wallet.calculateTransactionFee(tx);
};
