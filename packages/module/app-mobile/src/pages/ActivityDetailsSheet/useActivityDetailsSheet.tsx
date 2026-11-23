import { useConfig, useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { AccountId } from '@lace-contract/wallet-repo';
import { useTheme } from '@lace-lib/ui-toolkit';
import { useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { TFunction, TranslationKey } from '@lace-contract/i18n';
import type { SheetScreenProps, SheetRoutes } from '@lace-lib/navigation';

const activityTypeTranslationKeyById: Partial<Record<string, string>> = {
  Send: 'activity.history.send',
  Receive: 'activity.history.receive',
  Rewards: 'v2.activity-details.sheet.rewards',
};

export const getActivityTypeLabel = (
  t: TFunction,
  activityType?: string | null,
): string | undefined => {
  if (!activityType) return;
  const key = activityTypeTranslationKeyById[String(activityType)];
  // Only call t if key is a string and matches the valid translation keys
  return key && typeof key === 'string'
    ? t(key as unknown as TranslationKey)
    : undefined;
};

export const useActivityDetailsSheet = ({
  route,
}: SheetScreenProps<SheetRoutes.ActivityDetail>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { appConfig } = useConfig();
  const { activityId, activity: activityFromParams } = route.params;

  const [isLoading, setIsLoading] = useState(false);

  const loadingText = t('v2.activity-details.sheet.loading');

  const activityFromStore = useLaceSelector(
    'activities.selectActivityById',
    activityId,
  );
  const accountFilter = useMemo(
    () => ({ accountId: AccountId(activityFromParams?.accountId ?? '') }),
    [activityFromParams?.accountId],
  );
  const accountActivities = useLaceSelector(
    'activities.selectByAccountId',
    accountFilter,
  );
  // A transfer can appear in multiple accounts with the same transaction ID.
  const activity = activityFromParams
    ? accountActivities.find(item => item.activityId === activityId) ??
      activityFromParams
    : activityFromStore;

  const activityDetailsRaw = useLaceSelector(
    'activities.selectActivityDetails',
  );
  const activityDetails =
    activityDetailsRaw?.activityId === activityId &&
    (!activity || activityDetailsRaw.accountId === activity.accountId)
      ? activityDetailsRaw
      : undefined;

  const headerTitle =
    (!isLoading &&
      activityDetails?.type &&
      getActivityTypeLabel(t, activityDetails.type)) ||
    t('v2.activity-details.sheet.title');

  const loadActivityDetails = useDispatchLaceAction(
    'activities.loadActivityDetails',
  );

  const accountId = activity?.accountId ?? activityDetails?.accountId ?? '';
  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const account = accounts.find(a => a.accountId === accountId);
  const blockchainName = account?.blockchainName;

  const [address] = useLaceSelector(
    'addresses.selectByAccountId',
    AccountId(accountId),
  );

  useEffect(() => {
    if (
      activity &&
      activityDetails?.activityId !== activityId &&
      blockchainName
    ) {
      setIsLoading(true);
      loadActivityDetails({ activity, blockchainName });
    } else {
      setIsLoading(false);
    }
  }, [
    activity,
    activityDetails?.activityId,
    activityDetails?.accountId,
    activityId,
    blockchainName,
    loadActivityDetails,
  ]);

  const [activitiesItemUICustomisation] = useUICustomisation(
    'addons.loadActivitiesItemUICustomisations',
    { blockchainName: address?.blockchainName },
  );

  const explorerUrl = activitiesItemUICustomisation?.getExplorerUrl({
    config: appConfig,
    address,
    activityId: activityDetails?.activityId || '',
  });

  const tokensMetadataByTokenId = useLaceSelector(
    'tokens.selectTokensMetadata',
  );

  return {
    headerTitle,
    loadingText,
    activityDetails,
    // Resolve the type from the synchronously-available activity (route param /
    // store) so the sheet can pick its detent on first render, before the async
    // activityDetails load resolves. Avoids a full-height-then-collapse flash.
    activityType: activity?.type ?? activityDetails?.type,
    explorerUrl,
    getMainTokenBalanceChange:
      activitiesItemUICustomisation?.getMainTokenBalanceChange,
    tokensMetadataByTokenId,
    isLoading,
    theme,
    address,
    accountId: AccountId(accountId),
  };
};
