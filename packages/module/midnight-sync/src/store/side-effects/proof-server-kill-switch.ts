import isEqual from 'lodash/isEqual';
import {
  distinctUntilChanged,
  filter,
  from,
  mergeMap,
  withLatestFrom,
} from 'rxjs';

import type { SideEffect } from '../../context';
import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';

/** Persist the fallback when a selected provider is disabled or no longer
 * belongs to the source-controlled catalogue. Notify once per affected batch. */
export const migrateUnavailableProofServerSelection: SideEffect = (
  _,
  {
    midnightContext: {
      selectUnavailableProofServerNetworks$,
      selectNetworksConfig$,
      selectNetworksConfigFeatureFlagsOverrides$,
    },
  },
  { actions },
) =>
  selectUnavailableProofServerNetworks$.pipe(
    distinctUntilChanged<MidnightSDKNetworkId[]>(isEqual),
    filter(networkIds => networkIds.length > 0),
    withLatestFrom(
      selectNetworksConfig$,
      selectNetworksConfigFeatureFlagsOverrides$,
    ),
    mergeMap(([networkIds, networksConfig, featureFlagsOverrides]) =>
      from([
        ...networkIds.map((networkId: MidnightSDKNetworkId) =>
          actions.midnightContext.setUserNetworkConfigOverride({
            networkId,
            config: networksConfig[networkId],
            featureFlagsOverrides: featureFlagsOverrides[networkId] ?? {},
          }),
        ),
        actions.ui.showToast({
          text: 'midnight.proof-server.unavailable',
          color: 'neutral',
          duration: 8,
          leftIcon: { name: 'AlertTriangle', size: 20 },
        }),
      ]),
    ),
  );
