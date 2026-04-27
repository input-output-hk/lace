import { Cardano } from '@cardano-sdk/core';
import HandleClient, {
  KoraLabsProvider,
  HandleClientContext,
} from '@koralabs/adahandle-sdk';
import {
  CardanoNetworkId,
  CardanoPaymentAddress,
} from '@lace-contract/cardano-context';
import { HexBytes, None, Timestamp, Uri } from '@lace-sdk/util';
import { Some } from '@lace-sdk/util';
import { catchError, from, map, of } from 'rxjs';

import { HandleType } from '../value-objects';

import type { AvailableAddons } from '..';
import type { Handle } from '../value-objects';
import type {
  AddressAliasResolution,
  AddressAliasResolver,
} from '@lace-contract/addresses';
import type { ContextualLaceInit } from '@lace-contract/module';

const looksLikeAlias = (maybeAlias: string): maybeAlias is Handle =>
  maybeAlias.startsWith('$') && maybeAlias.length > 2;

const init: ContextualLaceInit<AddressAliasResolver, AvailableAddons> = (
  {
    runtime: {
      config: {},
    },
  },
  { logger },
) => {
  const clients: Partial<Record<Cardano.NetworkMagic, HandleClient>> = {
    [Cardano.NetworkMagics.Mainnet]: new HandleClient({
      context: HandleClientContext.MAINNET,
      provider: new KoraLabsProvider(HandleClientContext.MAINNET),
    }),
    [Cardano.NetworkMagics.Preview]: new HandleClient({
      context: HandleClientContext.PREVIEW,
      provider: new KoraLabsProvider(HandleClientContext.PREVIEW),
    }),
  };
  return {
    looksLikeAlias,
    resolveAlias: (alias, networkId) => {
      if (!looksLikeAlias(alias)) return of(None);
      const networkMagic = CardanoNetworkId.getChainId(networkId)?.networkMagic;
      if (!networkMagic) return of(None);
      const client = clients[networkMagic];
      if (!client) return of(None);
      const hexAlias = HexBytes.fromUTF8(alias.substring(1));
      return from(client.provider().getAllData({ value: hexAlias })).pipe(
        map(
          (response): Some<AddressAliasResolution> =>
            Some({
              alias,
              blockchainName: 'Cardano',
              networkId,
              aliasType: HandleType(),
              resolvedAddress: CardanoPaymentAddress(
                response.resolved_addresses.ada,
              ),
              image: Uri(response.pfp_image || response.image),
              resolvedAt: Timestamp.now(),
            }),
        ),
        catchError(error => {
          logger.warn('Failed to resolve handle', error);
          return of(None);
        }),
      );
    },
  };
};

export default init;
