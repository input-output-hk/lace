import React from 'react';
import isUndefined from 'lodash/isUndefined';
import { SendTransaction } from '../../features/send-transaction';
import { useDrawer } from '../../stores';
import { Drawer } from '@lace/common';
import { QRInfoWalletDrawer } from '../QRInfoWalletDrawer';
import { WalletUsedAddressesDrawer } from '../WalletUsedAddressesDrawer';
import { Skeleton } from 'antd';

export enum DrawerContent {
  SEND_TRANSACTION = 'send-trasaction',
  RECEIVE_TRANSACTION = 'receive-transaction',
  SHOW_USED_ADDRESSES = 'show-used-addresses'
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
      return <SendTransaction />;
    case DrawerContent.RECEIVE_TRANSACTION:
      return <QRInfoWalletDrawer />;
    case DrawerContent.SHOW_USED_ADDRESSES:
      return <WalletUsedAddressesDrawer />;
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
