import {
  defaultTxTtlLength,
  fromUnshieldedTokenType,
  midnightWallets$,
} from '@lace-contract/midnight-context';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { BigNumber, HexBytes } from '@lace-lib/util';
import { nativeToken } from '@midnight-ntwrk/ledger-v8';
import {
  DustAddress,
  MidnightBech32m,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';
import { map, switchMap, take, throwError } from 'rxjs';

import type { MidnightTxParameters } from '../store/tx-executor/build-tx';
import type {
  MidnightSDKNetworkId,
  MidnightSignRequest,
  MidnightSignResult,
  MidnightTransactionSigner,
  MidnightWallet,
} from '@lace-contract/midnight-context';
import type { SignerAuth } from '@lace-contract/signer';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { CombinedTokenTransfer } from '@midnightntwrk/wallet-sdk/facade';
import type { Observable } from 'rxjs';

/**
 * Maps the serialized transfers into the facade's combined-transfer shape.
 * Every transfer shares one kind — mixed selections are rejected at build
 * time by flattenTransfers — so exactly one CombinedTokenTransfer entry is
 * built, holding all outputs; the SDK covers them in a single transaction.
 */
const toOutputs = (
  { transfers }: MidnightTxParameters,
  networkId: MidnightSDKNetworkId,
): CombinedTokenTransfer[] => {
  if (transfers[0].tokenKind === 'unshielded') {
    return [
      {
        type: 'unshielded',
        outputs: transfers.map(({ amount, receiverAddress, type }) => ({
          type: fromUnshieldedTokenType(type, networkId),
          receiverAddress: UnshieldedAddress.codec.decode(
            networkId,
            MidnightBech32m.parse(receiverAddress),
          ),
          amount: BigNumber.valueOf(amount),
        })),
      },
    ];
  }
  return [
    {
      type: 'shielded',
      outputs: transfers.map(({ amount, receiverAddress, type }) => ({
        type,
        receiverAddress: ShieldedAddress.codec.decode(
          networkId,
          MidnightBech32m.parse(receiverAddress),
        ),
        amount: BigNumber.valueOf(amount),
      })),
    },
  ];
};

const signWithWallet = (
  midnightWallet: MidnightWallet,
  request: MidnightSignRequest,
): Observable<MidnightSignResult> => {
  const txParams = JSON.parse(
    HexBytes.toUTF8(request.serializedTx),
  ) as MidnightTxParameters;
  const outputs =
    request.flowType === 'dust-designation'
      ? []
      : toOutputs(txParams, midnightWallet.networkId);
  // Unshielded inputs are signature-based and need the explicit signRecipe
  // step; a shielded-only recipe is signed as part of proving instead. All
  // transfers share one kind (mixed selections are rejected at build time),
  // so the first transfer determines the signing path.
  const hasUnshieldedTransfer =
    txParams.transfers[0].tokenKind === 'unshielded';
  const ttl = new Date(Date.now() + defaultTxTtlLength);

  if (request.flowType === 'dust-designation') {
    const dustAddress = DustAddress.codec.decode(
      midnightWallet.networkId,
      MidnightBech32m.parse(txParams.transfers[0].receiverAddress),
    );
    return midnightWallet.state().pipe(
      take(1),
      map(({ unshielded: { availableCoins } }) =>
        availableCoins.filter(
          ({ utxo: { type } }) => type === nativeToken().raw,
        ),
      ),
      switchMap(availableNightCoins => {
        const hasNightRegistration = availableNightCoins.some(
          coin => coin.meta.registeredForDustGeneration,
        );

        if (hasNightRegistration) {
          return midnightWallet
            .registerNightUtxosForDustGeneration(
              availableNightCoins,
              dustAddress,
            )
            .pipe(
              switchMap(unprovenTxRecipe =>
                midnightWallet.balanceUnprovenTransaction(
                  unprovenTxRecipe.transaction,
                  { ttl, tokenKindsToBalance: ['dust'] },
                ),
              ),
            );
        }

        return midnightWallet.registerNightUtxosForDustGeneration(
          availableNightCoins,
          dustAddress,
        );
      }),
      switchMap(signedRecipe => midnightWallet.finalizeRecipe(signedRecipe)),
      map(transaction => ({
        serializedTx: HexBytes.fromByteArray(transaction.serialize()),
      })),
    );
  }

  if (hasUnshieldedTransfer) {
    return midnightWallet.transferTransaction(outputs, { ttl }).pipe(
      switchMap(recipe => midnightWallet.signRecipe(recipe)),
      switchMap(signedRecipe => midnightWallet.finalizeRecipe(signedRecipe)),
      map(transaction => ({
        serializedTx: HexBytes.fromByteArray(transaction.serialize()),
      })),
    );
  }

  // shielded-only transfers
  return midnightWallet.transferTransaction(outputs, { ttl }).pipe(
    switchMap(signedRecipe => midnightWallet.finalizeRecipe(signedRecipe)),
    map(transaction => ({
      serializedTx: HexBytes.fromByteArray(transaction.serialize()),
    })),
  );
};

/** Signs Midnight transactions using the wallet SDK after user authentication. */
export class MidnightInMemoryTransactionSigner
  implements MidnightTransactionSigner
{
  readonly #accountId: AccountId;
  readonly #auth: SignerAuth;

  public constructor(params: { accountId: AccountId; auth: SignerAuth }) {
    this.#accountId = params.accountId;
    this.#auth = params.auth;
  }

  public sign(request: MidnightSignRequest): Observable<MidnightSignResult> {
    return this.#auth.authenticate().pipe(
      switchMap(confirmed => {
        if (!confirmed)
          return throwError(() => new AuthenticationCancelledError());
        return midnightWallets$.pipe(
          take(1),
          switchMap(wallets => {
            const midnightWallet = wallets[this.#accountId];
            if (!midnightWallet) {
              throw new Error(
                `Could not load midnight wallet for account ${this.#accountId}`,
              );
            }
            return signWithWallet(midnightWallet, request);
          }),
        );
      }),
    );
  }
}
