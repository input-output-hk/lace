import {
  PoolDetailsSheet,
  PoolDetailsSheetSkeleton,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useStakePoolDetails } from './useStakePoolDetails';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const StakePoolDetailsSheet = (
  props: SheetScreenProps<SheetRoutes.StakePoolDetails>,
) => {
  const { navigation } = props;
  const stakePoolDetailsProps = useStakePoolDetails(props.route.params);

  useEffect(() => {
    if (!stakePoolDetailsProps) return;

    navigation.setOptions({
      header: (
        <Sheet.Header
          title={stakePoolDetailsProps.headerTitle}
          leftIconOnPress={navigation.goBack}
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: stakePoolDetailsProps.cancelButtonLabel,
            onPress: stakePoolDetailsProps.onCancelPress,
          }}
          primaryButton={{
            label: stakePoolDetailsProps.stakeButtonLabel,
            onPress: stakePoolDetailsProps.onStakePress,
            // Attribute-only test hook (zero logic/rendering change) — same
            // call-site pattern NetworkSheet.tsx's
            // `network-selection-sheet-confirm-button` already uses. Needed
            // so an e2e flow can deterministically confirm a pool CHOICE
            // (`onStakePress` routes to `handleSelectPress` in selection
            // mode) rather than clicking by visible label text, which is a
            // matrix-adjacent string this suite otherwise never hardcodes.
            testID: 'stake-pool-details-select-button',
          }}
        />
      ),
    });
  }, [navigation, stakePoolDetailsProps]);

  if (!stakePoolDetailsProps) {
    return <PoolDetailsSheetSkeleton />;
  }

  return <PoolDetailsSheet {...stakePoolDetailsProps} />;
};
