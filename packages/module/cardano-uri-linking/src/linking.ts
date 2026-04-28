import { Cardano } from '@cardano-sdk/core';
import {
  getStateFromPath,
  NavigationControls,
  SheetRoutes,
  StackRoutes,
} from '@lace-lib/navigation';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { LinkingOptions, ParamListBase } from '@lace-lib/navigation';
import type { DappConnectorSheetParams } from '@lace-lib/ui-toolkit';

const prefixes = ['cardano://', 'web+cardano://'];

export const linking: ContextualLaceInit<
  LinkingOptions<ParamListBase>,
  AvailableAddons
> = () => ({
  prefixes,
  config: {
    screens: {
      // CIP-099 Claims
      [StackRoutes.ClaimPayload]: {
        path: 'claim/v1',
        parse: {
          faucet_url: String,
        },
      },
      // TODO: add support for stake when available to deeplink
    },
    initialRouteName: StackRoutes.Home,
  },
  getStateFromPath: (path, options) => {
    const state = getStateFromPath(path, options);

    if (path.startsWith('browse/v1')) {
      const [_, queryString] = path.split('?');
      const queryParams = new URLSearchParams(queryString);
      const uri = queryParams.get('uri');

      if (uri) {
        try {
          const cleanUri = new URL(uri);
          NavigationControls.actions.closeAndNavigate(
            StackRoutes.DappExternalWebView,
            {
              buttonUrl: cleanUri.toString(),
            } as DappConnectorSheetParams,
          );
          // Return after triggering navigation to prevent further processing
          return state;
        } catch {
          return state;
        }
      }
    }
    // If the path didn't match any configured screen attempt to cast against the payment ref
    if (!state) {
      try {
        const [address, _] = path.split('?');
        if (Cardano.Address.isValid(address)) {
          NavigationControls.sheets.navigate(SheetRoutes.Send, {
            recipientAddress: address,
          });
        }
      } catch {
        // hasn't matched any of CIP-0013 URIs
        // Do nothing, let the router handle it with a toast
        return state;
      }
    }
    return state;
  },
});

export default linking;
