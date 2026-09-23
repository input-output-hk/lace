import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  CustomTag,
  Divider,
  footerHeight,
  Icon,
  Row,
  spacing,
  Text,
} from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet } from 'react-native';

import type { CnightActionMode } from './useCnightDesignationSheet';

interface CnightDesignationReviewProps {
  actionMode: CnightActionMode;
  isOwnTarget: boolean;
  accountName: string;
  dustAddress: string;
  feeFormatted: string | undefined;
  feeFiatFormatted: string | undefined;
}

export const CnightDesignationReview = ({
  actionMode,
  isOwnTarget,
  accountName,
  dustAddress,
  feeFormatted,
  feeFiatFormatted,
}: CnightDesignationReviewProps) => {
  const { t } = useTranslation();

  // deregister has no new recipient — it stops generation and burns the
  // mapping; show the stop rationale and the fee, no target row.
  const isDeregister = actionMode === 'deregister';

  return (
    <Column style={styles.container}>
      {isDeregister ? (
        // The destructive stop warning lives on this confirmation step (not the
        // manage form), so the "DUST already generated stays with the current
        // recipient" reassurance is read right before the user authenticates.
        <Text.S variant="negative" testID="cnight-deregister-warning">
          {t('v2.cnight-designation.deregister.description')}
        </Text.S>
      ) : (
        <Text.S variant="secondary">
          {t('v2.cnight-designation.review.description')}
        </Text.S>
      )}
      <Divider />
      {!isDeregister && (
        <>
          {isOwnTarget ? (
            <Row justifyContent="space-between" alignItems="center">
              <Text.M
                variant="secondary"
                testID="cnight-designation-review-recipient-label">
                {t('v2.cnight-designation.review.recipient')}
              </Text.M>
              <CustomTag
                label={accountName}
                icon={<Icon name="Midnight" size={16} />}
                color="white"
                testID="cnight-designation-review-account-tag"
              />
            </Row>
          ) : (
            <Column gap={spacing.XS}>
              <Text.M
                variant="secondary"
                testID="cnight-designation-review-recipient-label">
                {t('v2.cnight-designation.review.recipient')}
              </Text.M>
              <Text.M testID="cnight-designation-review-external-address">
                {dustAddress}
              </Text.M>
            </Column>
          )}
          <Divider />
        </>
      )}
      <Row justifyContent="space-between" alignItems="center">
        <Text.M
          variant="secondary"
          testID="cnight-designation-review-fee-label">
          {t('v2.cnight-designation.review.estimated-fee')}
        </Text.M>
        <Column alignItems="flex-end">
          <Text.M testID="cnight-designation-review-fee-value">
            {feeFormatted ?? ''}
          </Text.M>
          {feeFiatFormatted && (
            <Text.S
              variant="secondary"
              testID="cnight-designation-review-fee-fiat">
              {feeFiatFormatted}
            </Text.S>
          )}
        </Column>
      </Row>
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.M,
    // Footer (Confirm) is an overlay; pad so the fee row isn't hidden behind it.
    paddingBottom: footerHeight.horizontal,
    gap: spacing.L,
  },
});
