import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import {
  clampCenteredContentWidth,
  getLeftGapOnSideMenu,
  isExtensionSidePanel,
} from '../../util';

export type PageContainerTemplateProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
  fullWidth?: boolean;
};

export const PageContainerTemplate = ({
  children,
  style,
  contentStyle,
  testID,
  fullWidth = false,
}: PageContainerTemplateProps) => {
  const { isSideMenu } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const { containerStyle, contentContainerStyle } = useMemo(
    () => getStyles({ isSideMenu, windowWidth }),
    [isSideMenu, windowWidth],
  );

  return (
    <View style={[containerStyle, style]} testID={testID}>
      {fullWidth ? (
        children
      ) : (
        <View style={[contentContainerStyle, contentStyle]}>{children}</View>
      )}
    </View>
  );
};

const getStyles = ({
  isSideMenu,
  windowWidth,
}: {
  isSideMenu: boolean;
  windowWidth: number;
}) => {
  const leftGap = getLeftGapOnSideMenu(isSideMenu);
  const availableWidth = Math.max(0, windowWidth - leftGap);
  const contentWidth = isExtensionSidePanel
    ? clampCenteredContentWidth(availableWidth)
    : availableWidth;

  return StyleSheet.create({
    containerStyle: {
      flex: 1,
      paddingLeft: leftGap,
    },
    contentContainerStyle: {
      flex: 1,
      width: contentWidth,
      alignSelf: 'center',
      paddingHorizontal: spacing.M,
    },
  });
};
