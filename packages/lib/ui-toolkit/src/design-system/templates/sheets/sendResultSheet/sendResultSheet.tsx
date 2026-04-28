import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, type TextStyle, View } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Avatar, Card, Column, Divider, Icon, Row, Text } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';
import { getAssetImageUrl, truncateText } from '../../../util';

import type { IconName } from '../../../atoms';

type TransactionState = 'failure' | 'processing' | 'success';

export type SentToken = {
  token: {
    tokenId: string;
    displayShortName: string;
    decimals?: number;
    metadata?: { image?: string };
  };
  amount: string;
};

export type TransactionDetails = {
  sentTokens: SentToken[];
  recipientAddress: string;
  fee: string;
};

interface SendResultSheetProps {
  headerTitle: string;
  transactionState: { status: TransactionState; blockchain: string };
  subtitle: string;
  icon: {
    name: IconName;
    variant: 'solid' | 'stroke';
    size?: number;
  };
  transactionDetails?: TransactionDetails;
  footer?: {
    primaryButton?: {
      primaryButtonLabel: string;
      primaryButtonPress: () => void;
    };
    closeButton?: {
      closeButtonLabel: string;
      closeButtonPress: () => void;
    };
  };
  errorDetails?: {
    title: string;
    description: string;
    errorCode?: string;
    timestamp?: string;
    requestId?: string;
  };
  labels?: {
    sentLabel: string;
    recipientLabel: string;
    feeLabel: string;
  };
  /** When true, hides primary button on success screen. Defaults to true. */
  hidePrimaryButtonOnSuccess?: boolean;
}

const RecipientAddress = ({
  address,
  labels,
}: {
  address: string;
  labels: { recipientLabel: string };
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const truncatedAddress = truncateText(address, 20);
  const displayAddress = isExpanded ? address : truncatedAddress;
  // wordBreak is web-only; RN types don't include it but RN Web supports it
  const recipientValueStyle = {
    wordBreak: 'break-all' as const,
  } as TextStyle;
  const toggleAddress = useCallback(() => {
    setIsExpanded(previous => !previous);
  }, []);

  return (
    <Row justifyContent="space-between" alignItems="flex-start" gap={spacing.S}>
      <Text.M variant="secondary" testID="send-result-recipient-label">
        {labels.recipientLabel}
      </Text.M>
      <Pressable onPress={toggleAddress} style={styles.recipientPressable}>
        <Text.M
          style={recipientValueStyle}
          numberOfLines={isExpanded ? undefined : 1}
          ellipsizeMode="middle"
          testID="send-result-recipient-value"
          accessibilityLabel={address}>
          {displayAddress}
        </Text.M>
      </Pressable>
    </Row>
  );
};

const TransactionDetailsCard = ({
  transactionDetails,
  labels,
}: {
  transactionDetails: TransactionDetails;
  labels: {
    sentLabel: string;
    recipientLabel: string;
    feeLabel: string;
  };
}) => (
  <Card cardStyle={styles.transactionDetailsCard}>
    <Column gap={spacing.L}>
      <Row
        justifyContent="space-between"
        alignItems="flex-start"
        gap={spacing.S}>
        <Text.M variant="secondary" testID="send-result-sent-label">
          {labels.sentLabel}
        </Text.M>
        <Column alignItems="flex-end" gap={spacing.S}>
          {transactionDetails.sentTokens.map((item, index) => (
            <Row
              key={item.token.tokenId}
              alignItems="center"
              gap={spacing.S}
              testID={`send-result-sent-token-${index}`}>
              <Avatar
                content={{
                  ...(item.token.metadata?.image && {
                    img: {
                      uri: getAssetImageUrl(item.token.metadata.image),
                    },
                  }),
                  fallback: item.token.displayShortName,
                }}
                size={25}
                shape="squared"
                testID={`send-result-sent-avatar-${index}`}
              />
              <Text.M testID={`send-result-sent-value-${index}`}>
                {`${item.amount} ${item.token.displayShortName}`}
              </Text.M>
            </Row>
          ))}
        </Column>
      </Row>
      <Divider />
      <RecipientAddress
        address={transactionDetails.recipientAddress}
        labels={labels}
      />
      <Divider />
      <View style={styles.detailRow}>
        <Text.M variant="secondary" testID="send-result-fee-label">
          {labels.feeLabel}
        </Text.M>
        <Text.M testID="send-result-fee-value">{transactionDetails.fee}</Text.M>
      </View>
    </Column>
  </Card>
);

export const SendResultTemplate = ({
  headerTitle,
  transactionState,
  subtitle,
  icon,
  transactionDetails,
  labels,
  footer,
  errorDetails,
  hidePrimaryButtonOnSuccess = true,
}: SendResultSheetProps) => {
  const isSuccess = transactionState.status === 'success';
  const isFailure = transactionState.status === 'failure';

  const shouldShowSecondaryButton = !!footer?.closeButton;
  const shouldShowPrimaryButton =
    (isSuccess && !hidePrimaryButtonOnSuccess) || isFailure;
  const shouldShowFooter = shouldShowPrimaryButton || shouldShowSecondaryButton;

  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: shouldShowFooter ? footerHeight : 0 }),
    [shouldShowFooter, footerHeight],
  );

  return (
    <>
      <SheetHeader title={headerTitle} testID="send-result-sheet-header" />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContainerStyle}>
        <Column>
          <Column
            gap={spacing.M}
            alignItems="center"
            style={styles.content}
            justifyContent="center">
            <Icon
              name={icon.name}
              size={icon.size || 48}
              variant={icon.variant || 'stroke'}
              testID="send-result-icon"
            />
            <Text.M align="center" testID="send-result-subtitle">
              {subtitle}
            </Text.M>
          </Column>
          {!!transactionDetails && isSuccess && !!labels && (
            <TransactionDetailsCard
              transactionDetails={transactionDetails}
              labels={labels}
            />
          )}
          {!!errorDetails && (
            <Card cardStyle={styles.errorDetails}>
              <Text.M variant="secondary" testID="send-result-error-title">
                {errorDetails.title}
              </Text.M>
              <Text.M testID="send-result-error-description">
                {errorDetails.description}
              </Text.M>
              {!!errorDetails.errorCode && (
                <Text.M testID="send-result-error-code">
                  {errorDetails.errorCode}
                </Text.M>
              )}
              {!!errorDetails.timestamp && (
                <Text.M testID="send-result-error-timestamp">
                  {errorDetails.timestamp}
                </Text.M>
              )}
              {!!errorDetails.requestId && (
                <Text.M testID="send-result-error-request-id">
                  {errorDetails.requestId}
                </Text.M>
              )}
            </Card>
          )}
        </Column>
      </Sheet.Scroll>
      {shouldShowFooter && (
        <SheetFooter
          secondaryButton={
            shouldShowSecondaryButton && footer?.closeButton
              ? {
                  label: footer.closeButton.closeButtonLabel,
                  onPress: footer.closeButton.closeButtonPress,
                  testID: 'send-result-close-button',
                }
              : undefined
          }
          primaryButton={
            shouldShowPrimaryButton && footer?.primaryButton
              ? {
                  label: footer.primaryButton.primaryButtonLabel,
                  onPress: footer.primaryButton.primaryButtonPress,
                  testID: 'send-result-primary-button',
                }
              : undefined
          }
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.XXXXL,
  },
  transactionDetailsCard: {
    marginBottom: spacing.XXXL,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.S,
  },
  recipientPressable: {
    flex: 1,
    alignItems: 'flex-end',
  },
  errorDetails: {
    marginBottom: spacing.XXXL,
  },
});
