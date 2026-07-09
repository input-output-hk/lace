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
