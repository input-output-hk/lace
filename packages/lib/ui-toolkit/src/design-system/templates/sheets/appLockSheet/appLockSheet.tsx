import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Text } from '../../../atoms';
import { SheetHeader, RadioGroup, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

interface AppLockSheetProps {
  title: string;
  description: string;
  infoLabel: string;
  lockTimeOutOptions: Array<{ label: string; value: string }>;
  selectedLockTimeout: string;
  onLockTimeoutChange: (value: string) => void;
}
export const AppLockSheet = ({
  title,
  description,
  infoLabel,
  lockTimeOutOptions,
  selectedLockTimeout,
  onLockTimeoutChange,
}: AppLockSheetProps) => {
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles({ footerHeight }), [footerHeight]);

  return (
    <>
      <SheetHeader
        title={title}
        testID={'app-lock-inactivity-timeout-header'}
      />
      <Sheet.Scroll contentContainerStyle={styles.contentContainer}>
        <Column style={styles.content} gap={spacing.S}>
          <Text.M testID="app-lock-inactivity-timeout-description-1">
            {infoLabel}
          </Text.M>
          <Text.XS
            style={styles.infoText}
            variant="secondary"
            testID="app-lock-inactivity-timeout-info">
            {description}
          </Text.XS>
          <RadioGroup
            testID="app-lock-inactivity-timeout-radio-group"
            options={lockTimeOutOptions}
            value={selectedLockTimeout}
            onChange={onLockTimeoutChange}
            direction="column"
          />
        </Column>
      </Sheet.Scroll>
    </>
  );
};

const getStyles = ({ footerHeight }: { footerHeight: number }) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom: footerHeight,
    },
    content: {
      paddingBottom: spacing.M,
    },
    infoText: {
      paddingBottom: spacing.M,
    },
  });
