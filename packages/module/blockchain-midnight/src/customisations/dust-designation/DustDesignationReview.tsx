import {
  Column,
  CustomTag,
  Divider,
  Icon,
  Row,
  Sheet,
  SheetFooter,
  spacing,
  Text,
  useFooterHeight,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import type { FeeEntry } from '@lace-lib/ui-toolkit';

interface DustDesignationReviewProps {
  nightTokenTicker: string;
  dustTokenTicker: string;
  formattedNightBalance: string;
  estimatedFee: FeeEntry[];
  dustAddress: string;
  isOwnAddress: boolean;
  accountName: string;
  addressLabel: string;
  copies: {
    designatingLabel: string;
    estimatedFeeLabel: string;
    nextButtonLabel: string;
  };
  isReviewReady: boolean;
  onConfirm: () => void;
}

export const DustDesignationReview = ({
  nightTokenTicker,
  dustTokenTicker,
  formattedNightBalance,
  estimatedFee,
  dustAddress,
  isOwnAddress,
  accountName,
  addressLabel,
  copies,
  isReviewReady,
  onConfirm,
}: DustDesignationReviewProps) => {
  const feeDisplay =
    estimatedFee.length > 0
      ? `-${estimatedFee[0].amount} ${estimatedFee[0].token.displayShortName}`
      : `0 ${dustTokenTicker}`;

  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  return (
    <>
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContainerStyle}>
        <Column style={styles.container} gap={spacing.L}>
          <Row justifyContent="space-between">
            <Text.M
              variant="secondary"
              testID="dust-designation-review-designating-label">
              {copies.designatingLabel}
            </Text.M>
            <Text.M testID="dust-designation-review-amount">
              {formattedNightBalance} {nightTokenTicker}
            </Text.M>
          </Row>
          <Divider />
          {isOwnAddress ? (
            <Row justifyContent="space-between" alignItems="center">
              <Text.M
                variant="secondary"
                testID="dust-designation-review-recipient-label">
                {addressLabel}
              </Text.M>
              <CustomTag
                label={accountName}
                icon={<Icon name="Midnight" size={16} />}
                color="white"
                testID="dust-designation-review-account-tag"
              />
            </Row>
          ) : (
            <Column gap={spacing.XS}>
              <Text.M
                variant="secondary"
                testID="dust-designation-review-recipient-label">
                {addressLabel}
              </Text.M>
              <Text.M testID="dust-designation-review-external-address">
                {dustAddress}
              </Text.M>
            </Column>
          )}
          <Divider />
          <Row justifyContent="space-between">
            <Text.M
              variant="secondary"
              testID="dust-designation-review-fee-label">
              {copies.estimatedFeeLabel}
            </Text.M>
            <Text.M testID="dust-designation-review-fee-value">
              {feeDisplay}
            </Text.M>
          </Row>
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        primaryButton={{
          label: copies.nextButtonLabel,
          onPress: onConfirm,
          disabled: !isReviewReady,
          loading: !isReviewReady,
          testID: 'confirm-designation-button',
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
});
