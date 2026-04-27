import {
  BrowsePoolSheetContent,
  BrowsePoolTemplate,
  isWeb,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useBrowsePool } from './useBrowsePool';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const SHEET_HEIGHT_RATIO = 0.9;

export const BrowsePoolSheet = (
  props: SheetScreenProps<SheetRoutes.BrowsePool>,
) => {
  const browsePoolProps = useBrowsePool(props.route.params);
  const { height: windowHeight } = useWindowDimensions();

  const containerStyle = useMemo(
    () => [styles.container, { height: windowHeight * SHEET_HEIGHT_RATIO }],
    [windowHeight],
  );

  if (isWeb) {
    return <BrowsePoolTemplate {...browsePoolProps} />;
  }

  return (
    <View style={containerStyle}>
      <BrowsePoolSheetContent {...browsePoolProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
