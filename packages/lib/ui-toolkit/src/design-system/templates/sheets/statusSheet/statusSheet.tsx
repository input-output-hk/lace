import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Text, Icon, Column } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { IconName } from '../../../atoms';

interface StatusSheetProps {
  title: string;
  description?: string;
  body: string;
  icon?: {
    name: IconName;
    variant?: 'solid' | 'stroke';
    size?: number;
  };
  buttonText: string;
  buttonAction: () => void;
  secondaryButtonText?: string;
  secondaryButtonAction?: () => void;
  testID?: string;
  buttonTestID?: string;
  secondaryButtonTestID?: string;
}

export const StatusSheet = ({
  title,
  description,
  body,
  icon,
  buttonText,
  buttonAction,
  secondaryButtonText,
  secondaryButtonAction,
  testID = 'status-sheet',
  buttonTestID = 'status-sheet-button',
  secondaryButtonTestID = 'status-sheet-secondary-button',
}: StatusSheetProps) => {
  const hasSecondaryButton = secondaryButtonText && secondaryButtonAction;
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  return (
    <>
      <SheetHeader
        title={title}
        subtitle={description}
        testID={`${testID}-header`}
      />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        testID={testID}
        contentContainerStyle={styles.contentContainer}>
        <Column
          justifyContent="center"
          alignItems="center"
          gap={spacing.M}
          style={styles.centeredContent}>
          {!!icon && (
            <Icon
              name={icon.name}
              size={icon.size || 48}
              variant={icon.variant || 'stroke'}
              testID={`${testID}-icon`}
            />
          )}
          <Text.M testID={`${testID}-message`}>{body}</Text.M>
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={
          hasSecondaryButton
            ? {
                label: secondaryButtonText,
                onPress: secondaryButtonAction,
                testID: secondaryButtonTestID,
              }
            : undefined
        }
        primaryButton={{
          label: buttonText,
          onPress: buttonAction,
          testID: buttonTestID,
        }}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom: footerHeight,
    },
    centeredContent: {
      marginVertical: '30%',
      minHeight: '40%',
    },
  });
