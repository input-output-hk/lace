import { useAnalytics } from '@lace-contract/analytics';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import {
  earnRewardsMode,
  earnRewardsPoolSelectionId,
  needsEarnRewardsPoolChoice,
} from '@lace-contract/earn-rewards';
import { useTranslation } from '@lace-contract/i18n';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { EarnRewardsCard } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLaceSelector } from '../hooks';
import { useEarnRewardsTarget } from '../target/use-earn-rewards-target';

import { earnRewardsNudgeFinePrintKey } from './nudge-fine-print';

type EarnRewardsBannerProps = {
  accountId: string;
};

/**
 * Earn-rewards nudge, rendered inline in the portfolio banner region via the
 * portfolio-announcements slot. Shows for a resolved target and an account whose
 * VOTE is not yet delegated — either nothing delegated at all (`stake-and-vote`)
 * or already staking without a DRep (`vote-only`, presented as "Unlock rewards").
 * An existing DRep hides it: changing a delegation is a deliberate action handled
 * by the advanced flows.
 */
export const EarnRewardsBanner = ({ accountId }: EarnRewardsBannerProps) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const target = useEarnRewardsTarget();
  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );
  const pendingActivitiesByAccount = useLaceSelector(
    'activities.selectPendingActivitiesByAccount',
  );
  const fungibleTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    accountId,
  );

  // Earn rewards is a Cardano staking feature — only nudge Cardano accounts.
  const account = accounts.find(a => a.accountId === AccountId(accountId));
  const isCardano = account?.blockchainName === 'Cardano';

  // Eligibility signals fed to the one shared audience rule (earnRewardsMode) so
  // the nudge and the staking/governance CTA reroutes never disagree.
  const info = rewardAccountDetailsMap[AccountId(accountId)]?.rewardAccountInfo;
  const hasPendingTx =
    (pendingActivitiesByAccount[AccountId(accountId)]?.length ?? 0) > 0;

  const adaAvailable = fungibleTokens.find(
    token => token.tokenId === LOVELACE_TOKEN_ID,
  )?.available;
  const hasAda =
    adaAvailable !== undefined && BigInt(adaAvailable.toString()) > 0n;

  // Which offer this account gets — undefined when it is not the audience.
  const mode = earnRewardsMode({
    rewardAccountInfo: info,
    hasPendingTx,
    hasAda,
    hasDRep: target?.dRep !== undefined,
  });
  const isVoteOnly = mode === 'vote-only';

  // A resolved target already implies the feature is enabled (see the resolver),
  // so the target is the single enablement gate here.
  const isVisible = !!target && isCardano && mode !== undefined;

  // Every funnel event carries the mode, so per-mode conversion can be computed
  // rather than only totals. `mode` is always set when these fire — the banner
  // renders nothing otherwise — and narrowing keeps the property off the event
  // rather than sending `undefined`.
  const handlePress = useCallback(() => {
    if (mode) trackEvent('earn rewards | nudge | press', { mode });
    // Straight to the pool list when there is a pool to choose: opening the
    // flow sheet only to redirect makes the user watch it dismiss again.
    if (needsEarnRewardsPoolChoice({ target, mode })) {
      NavigationControls.navigate(SheetRoutes.BrowsePool, {
        accountId,
        poolSelectionId: earnRewardsPoolSelectionId(accountId),
        poolSelectionNotice:
          target?.dRep === undefined ? 'stake' : 'stake-and-vote',
      });
      return;
    }
    NavigationControls.navigate(SheetRoutes.EarnRewards, { accountId });
  }, [accountId, mode, target, trackEvent]);

  // Impression: fires once when the nudge becomes eligible and renders.
  useEffect(() => {
    if (isVisible && mode) trackEvent('earn rewards | nudge | view', { mode });
  }, [isVisible, mode, trackEvent]);

  // `!target` is redundant (isVisible already implies it) but narrows `target`
  // to non-null for the JSX below — TS can't infer that through `isVisible`.
  if (!isVisible || !target) {
    return null;
  }

  // Rate-led headline when the offer advertises a rate — a range reads "Earn
  // {min} – {max} a year", a single value keeps the "up to" framing. Falls back
  // to the generic headline otherwise. Lace-support mechanics stay in the fine
  // print regardless.
  const title = isVoteOnly
    ? t('v2.earn-rewards.unlock.nudge.title')
    : !target.rate
    ? t('v2.earn-rewards.nudge.title')
    : target.rate.kind === 'range'
    ? t('v2.earn-rewards.nudge.title-with-rate-range', {
        min: target.rate.min,
        max: target.rate.max,
      })
    : t('v2.earn-rewards.nudge.title-with-rate', { rate: target.rate.value });

  return (
    <View style={styles.container}>
      <EarnRewardsCard
        title={title}
        description={t(
          isVoteOnly
            ? 'v2.earn-rewards.unlock.nudge.description'
            : 'v2.earn-rewards.nudge.description',
        )}
        finePrint={t(
          isVoteOnly
            ? 'v2.earn-rewards.unlock.nudge.fine-print'
            : earnRewardsNudgeFinePrintKey({
                asksForPool: target.poolId === undefined,
                delegatesVote: target.dRep !== undefined,
              }),
        )}
        ctaLabel={t(
          isVoteOnly
            ? 'v2.earn-rewards.unlock.nudge.cta'
            : 'v2.earn-rewards.nudge.cta',
        )}
        onPress={handlePress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
});
