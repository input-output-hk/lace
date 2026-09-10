import type { StyleProp, ViewStyle } from 'react-native';

import { Column, Loader, useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';

export interface SignReviewLoadingContentProps {
  style?: StyleProp<ViewStyle>;
  /** Test identifier, defaults to `sign-review-loading` */
  testID?: string;
}

/**
 * Centered loading indicator shown while a sign review request or its
 * supporting data (e.g. resolved PSBT inputs) is not yet available.
 */
export const SignReviewLoadingContent = ({
  style,
  testID = 'sign-review-loading',
}: SignReviewLoadingContentProps) => {
  const { theme } = useTheme();
  return (
    <Column
      alignItems="center"
      justifyContent="center"
      style={style}
      testID={testID}>
      <Loader size={36} color={theme.text.primary} />
    </Column>
  );
};
