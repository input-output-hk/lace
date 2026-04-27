import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { ActionButton } from '../../atoms';
import { PageHeader } from '../../molecules';
import { renderLaceFooterLogo } from '../../util';

import type { IconName } from '../../atoms';

export type AddWalletPageAction = {
  id: string;
  icon: IconName;
  title: string;
  onPress: () => void;
  testID?: string;
};

export interface AddWalletPageTemplateProps {
  title: string;
  actions: AddWalletPageAction[];
  onBackPress?: () => void;
  testID?: string;
}

export const AddWalletPageTemplate = ({
  title,
  actions,
  onBackPress,
  testID = 'add-wallet-page',
}: AddWalletPageTemplateProps) => {
  const styles = getStyles();

  return (
    <ScrollView
      testID={testID}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      <View style={styles.contentWrapper}>
        <PageHeader
          title={title}
          onBackPress={onBackPress}
          testID={`${testID}-header`}
        />

        <View style={styles.actionsContainer}>
          {actions.map(action => (
            <ActionButton
              key={action.id}
              icon={action.icon}
              title={action.title}
              onPress={action.onPress}
              testID={action.testID}
              containerStyle={styles.actionButton}
              textAlign="left"
            />
          ))}
        </View>
      </View>
      {renderLaceFooterLogo()}
    </ScrollView>
  );
};

const getStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
    },
    contentWrapper: {
      flex: 1,
    },
    actionsContainer: {
      gap: spacing.M,
      paddingHorizontal: spacing.L,
      paddingBottom: spacing.L,
    },
    actionButton: {
      alignSelf: 'stretch',
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingVertical: spacing.XL,
      paddingStart: spacing.L,
    },
    footer: {
      paddingBottom: spacing.L,
    },
  });

export default AddWalletPageTemplate;
