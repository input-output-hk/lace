import {
  defaultTxTtlLength,
  fromUnshieldedTokenType,
  midnightWallets$,
} from '@lace-contract/midnight-context';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { BigNumber, HexBytes } from '@lace-sdk/util';
import { nativeToken } from '@midnight-ntwrk/ledger-v8';
import {
  DustAddress,
  MidnightBech32m,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnight-ntwrk/wallet-sdk-address-format';
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
import type { CombinedTokenTransfer } from '@midnight-ntwrk/wallet-sdk-facade';
import type { Observable } from 'rxjs';

const toOutputs = (
  { amount, receiverAddress, tokenKind, type }: MidnightTxParameters,
  networkId: MidnightSDKNetworkId,
): CombinedTokenTransfer[] => {
  const parsedAddress = MidnightBech32m.parse(receiverAddress);

  if (tokenKind === 'unshielded') {
    return [
      {
        type: tokenKind,
        outputs: [
          {
            type: fromUnshieldedTokenType(type, networkId),
            receiverAddress: UnshieldedAddress.codec.decode(
              networkId,
              parsedAddress,
            ),
            amount: BigNumber.valueOf(amount),
          },
        ],
      },
    ];
  }

  return [
    {
      type: tokenKind,
      outputs: [
        {
          type,
          receiverAddress: ShieldedAddress.codec.decode(
            networkId,
            parsedAddress,
          ),
          amount: BigNumber.valueOf(amount),
        },
      ],
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
  const tokenKind = txParams.tokenKind;
  const ttl = new Date(Date.now() + defaultTxTtlLength);

  if (request.flowType === 'dust-designation') {
    const dustAddress = DustAddress.codec.decode(
      midnightWallet.networkId,
      MidnightBech32m.parse(txParams.receiverAddress),
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

  if (tokenKind === 'unshielded') {
    return midnightWallet.transferTransaction(outputs, { ttl }).pipe(
      switchMap(recipe => midnightWallet.signRecipe(recipe)),
      switchMap(signedRecipe => midnightWallet.finalizeRecipe(signedRecipe)),
      map(transaction => ({
        serializedTx: HexBytes.fromByteArray(transaction.serialize()),
      })),
    );
  }

  // tokenKind shielded
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
