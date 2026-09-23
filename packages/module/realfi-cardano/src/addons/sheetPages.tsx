import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { ManageStake } from '../pages/ManageStake';
import { RealFiAddedToQueue } from '../pages/RealFiAddedToQueue';
import { RealFiOnboarding } from '../pages/RealFiOnboarding';
import { RealFiReviewTransaction } from '../pages/RealFiReviewTransaction';
import { RealFiRPointsByAccount } from '../pages/RealFiRPointsByAccount';
import { RealFiRPointsExplainer } from '../pages/RealFiRPointsExplainer';
import { RealFiSelectStakeToken } from '../pages/RealFiSelectStakeToken';
import { RealFiStakeDetail } from '../pages/RealFiStakeDetail';
import { RealFiTransactionError } from '../pages/RealFiTransactionError';
import { RealFiWithdraw } from '../pages/RealFiWithdraw';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

// USDr staking sheets (detail, onboarding, manage/review/queue, withdraw,
// error), all behind FEATURE_FLAG_REALFI. Transactions build via the partner
// SDK tx-builder and sign/submit through Lace's tx-executor.
const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="realfi-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.RealFiOnboarding}
      component={RealFiOnboarding}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.RealFiStakeDetail}
      component={RealFiStakeDetail}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.RealFiManageStake}
      component={ManageStake}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.RealFiSelectStakeToken}
      component={RealFiSelectStakeToken}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.RealFiReviewTransaction}
      component={RealFiReviewTransaction}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.RealFiAddedToQueue}
      component={RealFiAddedToQueue}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.RealFiWithdraw}
      component={RealFiWithdraw}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.RealFiTransactionError}
      component={RealFiTransactionError}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.RealFiRPointsExplainer}
      component={RealFiRPointsExplainer}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.RealFiRPointsByAccount}
      component={RealFiRPointsByAccount}
      options={{ detents: [1], scrollable: true }}
    />
  </React.Fragment>
);

export default sheetPages;
