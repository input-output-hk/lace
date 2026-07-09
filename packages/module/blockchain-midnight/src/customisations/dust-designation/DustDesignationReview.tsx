import {
  Column,
  CustomTag,
  Divider,
  Icon,
  Row,
  Sheet,
  spacing,
  Text,
} from '@lace-lib/ui-toolkit';
import React from 'react';
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
}: DustDesignationReviewProps) => {
  const feeDisplay =
    estimatedFee.length > 0
      ? `-${estimatedFee[0].amount} ${estimatedFee[0].token.displayShortName}`
      : `0 ${dustTokenTicker}`;

  return (
    <Sheet.Scroll showsVerticalScrollIndicator={false}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.M,
    flex: 1,
  },
});
