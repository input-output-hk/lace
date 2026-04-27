import { PoolStatusSheet, PoolStatusSheetSkeleton } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useStakingIssueSheet } from './useStakingIssueSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const StakingIssueSheet = (
  props: SheetScreenProps<SheetRoutes.StakingIssue>,
) => {
  const { accountId, issueType } = props.route.params;

  const poolStatusSheetProps = useStakingIssueSheet(accountId, issueType);

  if (!poolStatusSheetProps) {
    return <PoolStatusSheetSkeleton />;
  }

  return <PoolStatusSheet {...poolStatusSheetProps} />;
};
