import { Serialization } from '@cardano-sdk/core';
import { toContractAddress } from '@lace-contract/cardano-context';
import { Bip32Account } from '@lace-lib/core';
import { Err, Ok } from '@lace-lib/util';
import { catchError, defer, from, map, mergeMap, of } from 'rxjs';

import type { Providers } from '../../cardano/queries';
import type { ProviderError, SubmitTxArgs } from '@cardano-sdk/core';
import type {
  CardanoProvider,
  CardanoProviderContext,
  DiscoverAddressesProps,
  GetRewardAccountInfoProps,
} from '@lace-contract/cardano-context';

/**
 * The `cardanoProvider` the module's side-effects depend on, backed by the real
 * Blockfrost providers. Reward info reads through the typed provider, submit
 * posts the tx and derives its id, and the account-scan pair (discoverAddresses,
 * getAccountUtxos) is backed the same way the production blockfrost dependency
 * backs them, so the multi-account scan runs for real against the chain.
 */
export const cardanoProviderShim = (
  providers: Providers,
): Pick<
  CardanoProvider,
  'discoverAddresses' | 'getAccountUtxos' | 'getRewardAccountInfo' | 'submitTx'
> => ({
  getRewardAccountInfo: ({ rewardAccount }: GetRewardAccountInfoProps) =>
    providers.rewards.getRewardAccountInfo({ rewardAccount }),
  getAccountUtxos: props => providers.utxo.getAccountUtxos(props),
  discoverAddresses: (
    { xpub, accountIndex, thorough }: DiscoverAddressesProps,
    context: CardanoProviderContext,
  ) =>
    defer(() => from(Bip32Account.createDefaultDependencies())).pipe(
      mergeMap(dependencies =>
        providers.addressDiscovery
          .discover(
            new Bip32Account(
              {
                extendedAccountPublicKey: xpub,
                chainId: context.chainId,
                accountIndex,
              },
              dependencies,
            ),
            { thorough },
          )
          .pipe(
            map(result =>
              result.map(address =>
                toContractAddress(address, context.chainId.networkMagic),
              ),
            ),
          ),
      ),
    ),
  submitTx: ({ signedTransaction }: SubmitTxArgs) => {
    // Brand the submit-args cbor as TxCBOR once, for both the id derivation
    // and the submit.
    const cbor = Serialization.TxCBOR(signedTransaction as string);
    return defer(() =>
      from(providers.txSubmit.submitTx({ signedTransaction: cbor })),
    ).pipe(
      map(() => Ok(Serialization.Transaction.fromCbor(cbor).getId())),
      catchError((error: unknown) => of(Err(error as ProviderError))),
    );
  },
});
