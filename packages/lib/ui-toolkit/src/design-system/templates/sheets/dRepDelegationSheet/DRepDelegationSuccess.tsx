import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Column, Icon, Text } from '../../../atoms';
import { footerHeight } from '../../../organisms';

import type { Theme } from '../../../../design-tokens';

/**
 * Success body for a completed vote delegation. Renders the content only: the
 * screen that owns this template passes header/footer to the sheet through
 * navigation options, because a header/footer rendered as a sibling of the
 * content falls outside the sheet's bounds and clips off-screen. `onGoTo…` is
 * consumed by that screen's footer button. Mirrors `DelegationSuccess`.
 */
export interface DRepDelegationSuccessProps {
  onGoToGovernanceCenter: () => void;
  testID?: string;
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.XL,
      paddingBottom: footerHeight.horizontal,
    },
    icon: {
      marginBottom: spacing.L,
    },
    message: {
      color: theme.text.primary,
      textAlign: 'center',
      paddingHorizontal: spacing.M,
    },
  });

export const DRepDelegationSuccess = ({
  testID = 'drep-delegation-success-sheet',
}: DRepDelegationSuccessProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <Column style={styles.content} testID={testID}>
      <Icon name="RelievedFace" variant="solid" size={60} style={styles.icon} />
      <Text.M style={styles.message}>
        {t('v2.governance.delegation-success.subtitle')}
      </Text.M>
    </Column>
  );
};
