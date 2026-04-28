import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Button, Column, Row, Text } from '../../atoms';
import { PageHeader } from '../../molecules';
import { PageContainerTemplate } from '../pageContainerTemplate/pageContainerTemplate';

export type NotificationDetailsPageTemplateProps = {
  title: string;
  content: string;
  headerTitle: string;
  onBackPress: () => void;
  onDeletePress: () => void;
  testID?: string;
};

export const NotificationDetailsPageTemplate = ({
  title,
  content,
  headerTitle,
  onBackPress,
  onDeletePress,
  testID = 'notification-details-page',
}: NotificationDetailsPageTemplateProps) => {
  return (
    <PageContainerTemplate testID={testID}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}>
        <Row alignItems="center" style={styles.headerContent}>
          <View style={styles.headerPageTitle}>
            <PageHeader title={headerTitle} onBackPress={onBackPress} compact />
          </View>
          <View style={styles.deleteButton}>
            <Button.Primary preIconName="Delete" onPress={onDeletePress} />
          </View>
        </Row>
        <Column>
          <Text.L style={styles.bodyTitle} variant="primary">
            {title}
          </Text.L>
          <Text.M variant="primary">{content}</Text.M>
        </Column>
      </ScrollView>
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    justifyContent: 'center',
  },
  headerContent: {
    width: '100%',
  },
  headerPageTitle: {
    flex: 1,
  },
  deleteButton: {
    alignSelf: 'center',
  },
  bodyTitle: {
    paddingVertical: spacing.S,
  },
});
