import { useTranslation } from '@lace-contract/i18n';
import {
  PoolStatusSheet,
  PoolStatusSheetSkeleton,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useStakingIssueSheet } from './useStakingIssueSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const StakingIssueSheet = (
  props: SheetScreenProps<SheetRoutes.StakingIssue>,
) => {
  const { accountId, issueType } = props.route.params;
  const { t } = useTranslation();

  const poolStatusSheetProps = useStakingIssueSheet(accountId, issueType);
  const {
    primaryButtonLabel,
    secondaryButtonLabel,
    onPrimaryPress,
    onSecondaryPress,
    isSecondaryButtonDisabled,
  } = poolStatusSheetProps ?? {};
  const hasFooterButtons = Boolean(
    (primaryButtonLabel && onPrimaryPress) ||
      (secondaryButtonLabel && onSecondaryPress),
  );

  useEffect(() => {
    props.navigation.setOptions({
      header: <Sheet.Header title={t('v2.pool-status.title')} />,
      footer: hasFooterButtons ? (
        <Sheet.Footer
          showDivider={false}
          secondaryButton={
            secondaryButtonLabel && onSecondaryPress
              ? {
                  label: secondaryButtonLabel,
                  onPress: onSecondaryPress,
                  disabled: isSecondaryButtonDisabled,
                  testID: 'pool-status-sheet-secondary-button',
                }
              : undefined
          }
          primaryButton={
            primaryButtonLabel && onPrimaryPress
              ? {
                  label: primaryButtonLabel,
                  onPress: onPrimaryPress,
                  testID: 'pool-status-sheet-primary-button',
                }
              : undefined
          }
        />
      ) : undefined,
    });
  }, [
    props.navigation,
    t,
    hasFooterButtons,
    primaryButtonLabel,
    secondaryButtonLabel,
    onPrimaryPress,
    onSecondaryPress,
    isSecondaryButtonDisabled,
  ]);

  if (!poolStatusSheetProps) {
    return <PoolStatusSheetSkeleton />;
  }

  return <PoolStatusSheet {...poolStatusSheetProps} />;
};
