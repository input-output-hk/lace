/* eslint-disable react/no-multi-comp */
import React from 'react';
import { TransactionCTAs } from '@lace/core';
import { DrawerContent } from '@views/browser/components/Drawer';
import { useAnalyticsContext as useAnalytics } from '@providers/AnalyticsProvider';
import styles from './TransactionCTAsBox.module.scss';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import {
  SendFlowTriggerPoints,
  useAnalyticsSendFlowTriggerPoint,
  useOpenTransactionDrawer
} from '../../features/send-transaction';
import { useWalletStore } from '@stores';
import { useOpenReceiveDrawer } from './useOpenReceiveDrawer';
import { useCurrentBlockchain, Blockchain } from "@src/multichain";
import {useBitcoinSendDrawer} from "@views/browser/components/TransactionCTAsBox/useBitcoinSendDrawer";

export const TransactionCTAsBox = (): React.ReactElement => {
  const { isSharedWallet } = useWalletStore();
  const analytics = useAnalytics();
  const openSendTransactionDrawer = useOpenTransactionDrawer({ content: DrawerContent.SEND_TRANSACTION });
  const openCoSignTransactionDrawer = useOpenTransactionDrawer({ content: DrawerContent.CO_SIGN_TRANSACTION });
  const openSendBitcoinTransactionDrawer = useBitcoinSendDrawer();
  const { setTriggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const openReceiveDrawer = useOpenReceiveDrawer();
  const { blockchain } = useCurrentBlockchain();

  const openReceive = () => {
    openReceiveDrawer();
    analytics.sendEventToPostHog(PostHogAction.ReceiveClick);
  };

  const openSend = () => {
    isSharedWallet
      ? analytics.sendEventToPostHog(PostHogAction.SharedWalletsSendClick)
      : // eslint-disable-next-line camelcase
        analytics.sendEventToPostHog(PostHogAction.SendClick, { trigger_point: SendFlowTriggerPoints.SEND_BUTTON });
    blockchain === Blockchain.Cardano ? openSendTransactionDrawer() : openSendBitcoinTransactionDrawer();
    setTriggerPoint(SendFlowTriggerPoints.SEND_BUTTON);
  };

  const onCoSignClick = () => {
    analytics.sendEventToPostHog(PostHogAction.SharedWalletsCosignClick);
    openCoSignTransactionDrawer();
  };

  return (
    <TransactionCTAs
      buttonClassName={styles.btn}
      onSendClick={openSend}
      onReceiveClick={openReceive}
      onCoSignClick={isSharedWallet ? onCoSignClick : undefined}
    />
  );
};
