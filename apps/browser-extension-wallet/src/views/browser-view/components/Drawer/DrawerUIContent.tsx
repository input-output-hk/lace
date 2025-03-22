import React from 'react';
import isUndefined from 'lodash/isUndefined';
import { Transaction } from '../../features/send-transaction';
import { useDrawer } from '../../stores';
import { Drawer } from '@lace/common';
import { QRInfoWalletDrawer } from '../QRInfoWalletDrawer';
import { SignMessageDrawer } from '@views/browser/features/sign-message/SignMessageDrawer';
import { WalletUsedAddressesDrawer } from '../WalletUsedAddressesDrawer';
import { Skeleton } from 'antd';
import { BitcoinSendDrawer } from '@src/views/bitcoin-mode/features/send/components/BitcoinSendDrawer';
import { BitcoinQRInfoWalletDrawer } from '@src/views/bitcoin-mode/features/receive-info/components/BitcoinQRInfoWalletDrawer';

export enum DrawerContent {
  SEND_TRANSACTION = 'send-transaction',
  CO_SIGN_TRANSACTION = 'co-sign-transaction',
  RECEIVE_TRANSACTION = 'receive-transaction',
  SHOW_USED_ADDRESSES = 'show-used-addresses',
  SIGN_MESSAGE = 'sign-message-addresses',
  SEND_BITCOIN_TRANSACTION = 'send-bitcoin-transaction',
  RECEIVE_BITCOIN_TRANSACTION = 'receive-bitcoin-transaction'
}

export interface DrawerConfig {
  content: DrawerContent;
  onClose?: () => void;
  wrapperClassName?: string;
  renderHeader?: () => React.ReactNode;
  renderTitle?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
  options?: Record<string, unknown>;
}

const renderDrawerContent = (content?: DrawerContent) => {
  switch (content) {
    case DrawerContent.SEND_TRANSACTION:
      return <Transaction flow="send" />;
    case DrawerContent.CO_SIGN_TRANSACTION:
      return <Transaction flow="co-sign" />;
    case DrawerContent.RECEIVE_TRANSACTION:
      return <QRInfoWalletDrawer />;
    case DrawerContent.SHOW_USED_ADDRESSES:
      return <WalletUsedAddressesDrawer />;
    case DrawerContent.SIGN_MESSAGE:
      return <SignMessageDrawer />;
    case DrawerContent.SEND_BITCOIN_TRANSACTION:
      return <BitcoinSendDrawer />;
    case DrawerContent.RECEIVE_BITCOIN_TRANSACTION:
      return <BitcoinQRInfoWalletDrawer />;
    default:
      return <Skeleton />;
  }
};

export const DrawerUIContainer = ({ defaultContent }: { defaultContent?: DrawerContent }): React.ReactElement => {
  const [config, clearContent] = useDrawer();
  const footer = config?.renderFooter?.();

  return (
    <Drawer
      className={config?.wrapperClassName}
      visible={!isUndefined(config) || !isUndefined(defaultContent)}
      destroyOnClose
      onClose={() => (config?.onClose ? config?.onClose() : clearContent())}
      footer={footer || undefined}
      navigation={config?.renderHeader?.()}
      title={config?.renderTitle?.()}
      keyboard={false}
    >
      {renderDrawerContent(defaultContent || config?.content)}
    </Drawer>
  );
};
