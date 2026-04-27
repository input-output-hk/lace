import type { ImageURISource } from 'react-native';

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import {
  type AssetToSend,
  type FeeEntry,
} from '../../../../utils/sendSheetUtils';
import {
  Avatar,
  Column,
  CustomTag,
  Divider,
  Icon,
  Row,
  Text,
} from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';
import { getAssetImageUrl, truncateText } from '../../../util';

import type { IconName } from '../../../atoms/icons/Icon';

type Address = {
  value: string;
  proprietaryState: 'Foreign' | 'Own';
};

type TransactionDetail = {
  tickerValueAndSymbol: string;
  currencyValueAndName: string;
};

interface ReviewTransactionSheetProps {
  headerTitle: string;
  labels: {
    accountLabel: string;
    sendingLabel: string;
    recipientsAddressLabel: string;
    expiresByLabel: string;
    notesLabel: string;
    amountLabel: string;
    estimatedFeeLabel: string;
    totalAndFeesLabel: string;
    totalBreakDownLabel: string;
    nextButtonLabel: string;
  };
  backButtonPress: () => void;
  nextButtonPress: () => void;
  /** When true, disables the next/send button (e.g. while awaiting auth or processing). */
  nextButtonDisabled?: boolean;
  values: {
    accountValue: {
      name: string;
      image?: ImageURISource;
      blockchainName?: IconName;
    };
    recipientsAddressValue: Address;
    expiresByDate: {
      date: string;
      time: string;
    };
    notesValue: string;
    amountValue: TransactionDetail;
    estimatedFeeValue: FeeEntry;
    totalAndFeesValue: TransactionDetail;
    assetsToSend: AssetToSend[];
  };
}

export const ReviewTransactionTemplate = ({
  headerTitle,
  labels,
  values,
  backButtonPress,
  nextButtonPress,
  nextButtonDisabled = false,
}: ReviewTransactionSheetProps) => {
  const {
    accountLabel,
    sendingLabel,
    recipientsAddressLabel,
    expiresByLabel,
    notesLabel,
    // amountLabel,
    estimatedFeeLabel,
    totalAndFeesLabel,
    totalBreakDownLabel,
    nextButtonLabel,
  } = labels;
  const {
    accountValue,
    recipientsAddressValue,
    expiresByDate,
    notesValue,
    // amountValue,
    estimatedFeeValue,
    totalAndFeesValue,
    assetsToSend,
  } = values;

  const recipientAddressLabelColor =
    recipientsAddressValue.proprietaryState === 'Foreign'
      ? 'primary'
      : 'negative';

  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  return (
    <>
      <SheetHeader
        title={headerTitle}
        leftIconOnPress={backButtonPress}
        testID={'review-transaction-sheet-header'}
      />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContainerStyle}>
        <Column style={styles.container} gap={spacing.L}>
          <Row justifyContent="space-between">
            <Text.M
              variant="secondary"
              testID="review-transaction-account-label">
              {accountLabel}
            </Text.M>
            <CustomTag
              label={accountValue.name}
              imageSource={accountValue.image}
              icon={
                accountValue.blockchainName ? (
                  <Icon name={accountValue.blockchainName} size={16} />
                ) : undefined
              }
              color="white"
              testID="review-transaction-account-value"
            />
          </Row>
          <Divider />
          <Row justifyContent="space-between">
            <Text.M
              variant="secondary"
              testID="review-transaction-sending-label">
              {sendingLabel}
            </Text.M>
            <Column alignItems="flex-end" gap={spacing.M}>
              {assetsToSend?.map((asset, index) => (
                <Row
                  alignItems="center"
                  gap={spacing.S}
                  key={asset.token.tokenId}
                  testID={`review-transaction-asset-${index}`}>
                  <Avatar
                    content={{
                      ...(asset.token.metadata?.image && {
                        img: {
                          uri: getAssetImageUrl(asset.token.metadata.image),
                        },
                      }),
                      fallback: asset.token.displayShortName,
                    }}
                    size={25}
                    shape="squared"
                    testID={`review-transaction-asset-${index}-avatar`}
                  />

                  <Text.M
                    variant="secondary"
                    testID={`review-transaction-asset-${index}-value`}>
                    {asset.value}
                  </Text.M>

                  <Text.M
                    testID={`review-transaction-asset-${index}-short-name`}>
                    {asset.token.displayShortName}
                  </Text.M>
                </Row>
              ))}
            </Column>
          </Row>
          <Divider />

          <Row justifyContent="space-between" gap={spacing.S}>
            <Text.M
              numberOfLines={2}
              style={styles.recipientsAddressLabel}
              variant="secondary"
              testID="review-transaction-recipients-address-label">
              {recipientsAddressLabel}
            </Text.M>
            <Column
              gap={spacing.XS}
              alignItems="flex-end"
              style={styles.recipientValues}>
              <CustomTag
                label={recipientsAddressValue.proprietaryState}
                backgroundType="semiTransparent"
                color={recipientAddressLabelColor}
                size="S"
                testID="review-transaction-recipients-address-proprietary-state"
              />

              <Text.M
                numberOfLines={1}
                ellipsizeMode="middle"
                testID="review-transaction-recipients-address-value">
                {truncateText(recipientsAddressValue.value)}
              </Text.M>
            </Column>
          </Row>
          <Divider />
          {!!expiresByDate.date && !!expiresByDate.time && (
            <>
              <Row justifyContent="space-between">
                <Text.M
                  variant="secondary"
                  testID="review-transaction-expires-by-label">
                  {expiresByLabel}
                </Text.M>
                <Column alignItems="flex-end">
                  <Text.M testID="review-transaction-expires-by-date">
                    {expiresByDate.date}
                  </Text.M>
                  <Text.M
                    variant="secondary"
                    testID="review-transaction-expires-by-time">
                    {expiresByDate.time}
                  </Text.M>
                </Column>
              </Row>
              <Divider />
            </>
          )}
          {!!notesValue && (
            <>
              <Row justifyContent="space-between">
                <Text.M
                  variant="secondary"
                  testID="review-transaction-notes-label">
                  {notesLabel}
                </Text.M>
                <Text.M
                  variant="secondary"
                  testID="review-transaction-notes-value">
                  {notesValue}
                </Text.M>
              </Row>
              <Divider />
            </>
          )}

          <Text.M
            style={styles.totalBreakDownLabel}
            testID="review-transaction-total-breakdown-label">
            {totalBreakDownLabel}
          </Text.M>
          <Divider />
          <Row justifyContent="space-between">
            <Text.M
              variant="secondary"
              testID="review-transaction-estimated-fee-label">
              {estimatedFeeLabel}
            </Text.M>
            <Column alignItems="flex-end">
              <Text.M testID="review-transaction-estimated-fee-value">
                {`${estimatedFeeValue.value} ${estimatedFeeValue.token.displayShortName}`}
              </Text.M>
              {estimatedFeeValue.amount && (
                <Text.M
                  variant="secondary"
                  testID="review-transaction-estimated-fee-amount">
                  {`${estimatedFeeValue.amount} ${estimatedFeeValue.currency}`}
                </Text.M>
              )}
            </Column>
          </Row>
          <Divider />
          <Row justifyContent="space-between">
            <Text.M
              variant="secondary"
              testID="review-transaction-total-and-fees-label">
              {totalAndFeesLabel}
            </Text.M>
            <Column alignItems="flex-end">
              <Text.M testID="review-transaction-ticker-value-and-symbol">
                {totalAndFeesValue.tickerValueAndSymbol}
              </Text.M>
              <Text.M
                variant="secondary"
                testID="review-transaction-currency-value-and-name">
                {totalAndFeesValue.currencyValueAndName}
              </Text.M>
            </Column>
          </Row>
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        primaryButton={{
          label: nextButtonLabel,
          onPress: nextButtonPress,
          disabled: nextButtonDisabled,
          testID: 'review-transaction-sheet-next-button',
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.M,
    flex: 1,
  },
  totalBreakDownLabel: { alignSelf: 'center' },
  recipientsAddressLabel: {
    maxWidth: '50%',
  },
  recipientValues: {
    flex: 1,
  },
});
