import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../../common/hooks';

import type { DappInfo } from '../../../common/store/slice';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { AvatarContent, IconName } from '@lace-lib/ui-toolkit';

/**
 * Display-friendly dApp info for the UI.
 */
export type DisplayDapp = {
  icon: AvatarContent;
  name: string;
  category: string;
  coinIcons?: IconName[];
};

/**
 * Derives icon and name from DappInfo (Redux state).
 * category and coinIcons must be supplied by the caller from navigation params,
 * because DappInfo does not carry those fields.
 */
const toDappIconAndName = (
  dappInfo: DappInfo,
): Pick<DisplayDapp, 'icon' | 'name'> => ({
  icon: dappInfo.imageUrl
    ? { img: { uri: dappInfo.imageUrl } }
    : { fallback: dappInfo.name.charAt(0).toUpperCase() },
  name: dappInfo.name,
});

/**
 * Hook that provides state and actions for the AuthorizeDapp sheet.
 *
 * @param props - Sheet screen props containing route params
 * @returns Object containing display data and action handlers
 */
export const useAuthorizeDapp = ({
  route: { params },
}: SheetScreenProps<SheetRoutes.AuthorizeDapp>) => {
  const pendingRequest = useLaceSelector(
    'cardanoDappConnector.selectPendingAuthRequest',
  );

  const dispatchConfirmAuth = useDispatchLaceAction(
    'cardanoDappConnector.confirmAuth',
  );
  const dispatchRejectAuth = useDispatchLaceAction(
    'cardanoDappConnector.rejectAuth',
  );

  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const { dapp, details, title, dappOrigin, dappStatus = 'trusted' } = params;
  const displayOrigin = pendingRequest?.dappOrigin ?? dappOrigin;
  const displayDapp = useMemo((): DisplayDapp | null => {
    if (pendingRequest?.dapp) {
      // Use the live pending request for icon/name, but take category and
      // coinIcons from navigation params — DappInfo doesn't carry those fields.
      return {
        ...toDappIconAndName(pendingRequest.dapp),
        category: dapp?.category ?? 'DApp',
        coinIcons: dapp?.coinIcons,
      };
    }
    if (dapp) {
      return dapp;
    }
    return null;
  }, [pendingRequest?.dapp, dapp]);
  const [selectedAccount, setSelectAccount] = React.useState<AnyAccount | null>(
    null,
  );

  const hasRespondedRef = useRef(false);

  const headerTitle =
    title ?? t('dapp-connector.cardano.authorize.title', 'Authorize DApp');

  const handleAuthorize = useCallback(() => {
    trackEvent('dapp connector | authorize dapp | authorize | press');
    hasRespondedRef.current = true;
    dispatchConfirmAuth({ authorized: true, account: selectedAccount });
    NavigationControls.sheets.close();
  }, [selectedAccount, dispatchConfirmAuth, trackEvent]);

  const handleReject = useCallback(() => {
    trackEvent('dapp connector | authorize dapp | reject | press');
    hasRespondedRef.current = true;
    dispatchRejectAuth();
    NavigationControls.sheets.close();
  }, [dispatchRejectAuth, trackEvent]);

  const handleSetAccountId = useCallback(
    (account: AnyAccount) => {
      trackEvent('dapp connector | authorize dapp | select account | press', {
        account: account.accountId,
      });
      setSelectAccount(account);
    },
    [trackEvent],
  );

  useEffect(() => {
    if (!pendingRequest && !dapp) {
      NavigationControls.sheets.close();
    }
  }, [pendingRequest, dapp]);

  useEffect(() => {
    return () => {
      if (!hasRespondedRef.current && pendingRequest) {
        dispatchRejectAuth();
      }
    };
  }, [dispatchRejectAuth, pendingRequest]);

  return {
    headerTitle,
    details,
    displayDapp,
    displayOrigin,
    dappStatus,
    handleAuthorize,
    handleReject,
    handleSetAccountId,
    selectedAccount,
  };
};
