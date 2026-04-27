import { isNotNil } from '@cardano-sdk/util';
import { None, type Option } from '@lace-sdk/util';
import debounce from 'lodash/debounce';
import { useEffect, useRef, useState } from 'react';
import { firstValueFrom } from 'rxjs';

import { useLaceSelector, useLoadModules } from '../hooks';

import type {
  AddressAlias,
  AddressAliasResolution,
  AddressAliasResolver,
} from '@lace-contract/addresses';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { BlockchainName } from '@lace-lib/util-store';

const DEBOUNCE_MS = 300;

type UseResolveAddressAliasResult = {
  resolution: Option<AddressAliasResolution>;
  isResolving: boolean;
};

type ResolveParams = {
  trimmedAlias: AddressAlias;
  suitableResolvers: AddressAliasResolver[];
  networkIds: BlockchainNetworkId[];
};

// TODO: this hook and useAddressValidation should be implemented to do the work in SW
export const useResolveAddressAlias = (
  maybeAlias: string,
  blockchainType: BlockchainName | 'auto-detect',
): UseResolveAddressAliasResult => {
  const resolvers = useLoadModules('addons.loadAddressAliasResolver');
  const networkType = useLaceSelector('network.selectNetworkType');
  const blockchainNetworks = useLaceSelector(
    'network.selectBlockchainNetworks',
  );

  const [resolution, setResolution] =
    useState<Option<AddressAliasResolution>>(None);
  const [isResolving, setIsResolving] = useState(false);

  const debouncedResolveRef = useRef(
    debounce(
      async ({
        trimmedAlias,
        suitableResolvers,
        networkIds,
      }: ResolveParams) => {
        for (const networkId of networkIds) {
          for (const resolver of suitableResolvers) {
            const maybeResolvedAlias = await firstValueFrom(
              resolver.resolveAlias(trimmedAlias, networkId),
            );

            if (maybeResolvedAlias.isSome()) {
              setResolution(maybeResolvedAlias);
              setIsResolving(false);
              return;
            }
          }
        }
        setResolution(None);
        setIsResolving(false);
      },
      DEBOUNCE_MS,
    ),
  );

  // Trigger resolution when inputs change
  useEffect(() => {
    const trimmedAlias = maybeAlias.trim() as AddressAlias;

    // Early return for empty input or no resolvers
    if (!trimmedAlias || !resolvers) {
      debouncedResolveRef.current.cancel();
      setResolution(None);
      setIsResolving(false);
      return;
    }

    const suitableResolvers = resolvers.filter(resolver =>
      resolver.looksLikeAlias(trimmedAlias),
    );

    // No resolvers can handle this alias format
    if (suitableResolvers.length === 0) {
      debouncedResolveRef.current.cancel();
      setResolution(None);
      setIsResolving(false);
      return;
    }

    const networkIds =
      blockchainType === 'auto-detect'
        ? Object.values(blockchainNetworks).map(network => network[networkType])
        : [blockchainNetworks[blockchainType]?.[networkType]].filter(isNotNil);

    setIsResolving(true);
    void debouncedResolveRef.current({
      trimmedAlias,
      suitableResolvers,
      networkIds,
    });
  }, [maybeAlias, blockchainType, resolvers, networkType, blockchainNetworks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedResolveRef.current.cancel();
    };
  }, []);

  return { resolution, isResolving };
};
