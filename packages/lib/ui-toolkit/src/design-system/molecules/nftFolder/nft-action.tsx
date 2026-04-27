import type { StyleProp, ViewStyle } from 'react-native';

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, radius, spacing } from '../../../design-tokens';
import { IconButton } from '../../atoms';
import { BlurView } from '../../atoms/blur-view/blur-view';
import { Icon } from '../../atoms/icons/Icon';

import type { Theme } from '../../../design-tokens';

export type NFTActionProps = {
  onBackPress?: () => void;
  onEditPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  background?: 'blurred' | 'none';
};

export const NFTAction = ({
  onBackPress,
  onEditPress,
  style,
  testID,
  background = 'blurred',
}: NFTActionProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const Container = background === 'blurred' ? BlurView : View;
  const containerStyle = useMemo(
    () =>
      background === 'blurred'
        ? [styles.container, style]
        : [styles.containerNoBackground, style],
    [background, styles.container, styles.containerNoBackground, style],
  );

  return (
    <Container style={containerStyle} testID={testID}>
      <View style={styles.buttonContainer}>
        <IconButton.Static
          icon={<Icon name="ArrowLeft" size={17.5} />}
          onPress={onBackPress}
          containerStyle={styles.actionButton}
          testID={`${testID}-back-button`}
        />
        <IconButton.Static
          icon={<Icon name="FolderEdit" size={17.5} />}
          onPress={onEditPress}
          containerStyle={styles.actionButton}
          testID={`${testID}-edit-button`}
        />
      </View>
    </Container>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.S,
      borderWidth: 1,
      borderColor: theme.border.middle,
      width: 90,
      height: 90,
      justifyContent: 'center',
      alignItems: 'center',
    },
    containerNoBackground: {
      width: 90,
      height: 90,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: spacing.S,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButton: {
      width: 30,
      height: 30,
      borderRadius: radius.XS,
      paddingVertical: 0,
      paddingHorizontal: 0,
      backgroundColor: theme.background.primary,
      borderTopColor: theme.border.top,
      borderColor: theme.border.middle,
      borderBottomColor: theme.border.bottom,
      borderWidth: StyleSheet.hairlineWidth,
    },
  });
