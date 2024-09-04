/* eslint-disable consistent-return */
/* eslint-disable complexity */
import React, { useCallback, useMemo } from 'react';
import { QRCode, QRCodeProps, addEllipsis, toast } from '@lace/common';
import styles from './AddressCard.module.scss';
import { MenuProps, Tooltip } from 'antd';
import { Box, Divider, Flex } from '@input-output-hk/lace-ui-toolkit';
import { ReactComponent as AdaHandleIcon } from '../../assets/icons/handle-icon.component.svg';
import { ReactComponent as AdaSymbolIcon } from '../../assets/icons/ada-symbol-icon.component.svg';
import { ReactComponent as TokensIcon } from '../../assets/icons/tokens.component.svg';
import { ReactComponent as StakePoolIcon } from '../../assets/icons/stake-pool.component.svg';
import { AddressDisplayItem } from './AddressDisplayItem';
import { ACTION_ICON_SIZE, ICON_SIZE } from './const';
import { ReactComponent as MoreIcon } from '../../assets/icons/more-outlined.component.svg';
import { ReactComponent as AssetsIcon } from '../../assets/icons/assets.component.svg';
import { ReactComponent as NftsIcon } from '../../assets/icons/nft-thumb.component.svg';
import { ReactComponent as CheckIcon } from '../../assets/icons/check-token-icon.svg';
import { ReactComponent as CopyIcon } from '../../assets/icons/copy-icon.svg';
import { InfoCircleOutlined } from '@ant-design/icons';
import CopyToClipboard from 'react-copy-to-clipboard';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';

export type Props = {
  name?: string;
  address: string;
  isPopupView?: boolean;
  highlighted?: boolean;
  isUnused?: boolean;
  metadata?: {
    handles?: string[];
    balance?: string;
    tokens?: {
      amount: number;
      nfts?: number;
    };
    stakePool?: string;
  };
  tagWith?: {
    label: string;
    tooltip?: string | React.ReactNode;
  };
  getQRCodeOptions?: () => QRCodeProps['options'];
  onCopyClick?: () => void;
};

export const ADDRESS_CARD_QR_CODE_SIZE = 130;
export const ADDRESS_CARD_QR_CODE_SIZE_POPUP = 104;

const ADDRESS_HEAD_ELLIPSIS_LENGTH = 7;
const ADDRESS_TAIL_ELLIPSIS_LENGTH = 8;
const HANDLE_HEAD_ELLIPSIS_LENGTH = 4;
const HANDLE_TAIL_ELLIPSIS_LENGTH = 4;
const MAX_INLINE_ITEMS = 3;
const TOAST_DEFAULT_DURATION = 3;

export const AddressCard = ({
  name,
  address,
  tagWith,
  isPopupView,
  highlighted,
  isUnused,
  metadata,
  getQRCodeOptions,
  onCopyClick
}: Readonly<Props>): JSX.Element => {
  const { t } = useTranslation();

  const doToast = useCallback(() => {
    toast.notify({
      duration: TOAST_DEFAULT_DURATION,
      text: t('core.addressCard.handle.copy.notification'),
      icon: CopyIcon
    });
    onCopyClick();
  }, [onCopyClick, t]);

  const isMetadataGrouped = useMemo(() => {
    if (!metadata) {
      return false;
    }

    const keys = Object.keys(metadata) as (keyof typeof metadata)[];
    const length = keys.reduce((count, key) => {
      if (key === 'tokens' && metadata.tokens.amount === 0) {
        return count;
      }
      if (key === 'handles' && metadata.handles.length === 0) {
        return count;
      }
      return metadata[key] ? count + 1 : count;
    }, 0);

    return length > MAX_INLINE_ITEMS;
  }, [metadata]);

  const renderHandleData = useMemo(() => {
    if (!metadata || !metadata.handles) {
      return;
    }

    const { handles } = metadata;

    const adaHandleIcon = <AdaHandleIcon width={ICON_SIZE} height={ICON_SIZE} />;

    if (handles.length === 1) {
      return (
        <AddressDisplayItem
          label={addEllipsis(handles[0], HANDLE_HEAD_ELLIPSIS_LENGTH, HANDLE_TAIL_ELLIPSIS_LENGTH)}
          icon={adaHandleIcon}
          action="copy"
          tooltipLabel={t('core.addressCard.handle.copy.tooltip')}
          onCopy={doToast}
        />
      );
    }

    const items: MenuProps['items'] = handles.map((item, idx) => ({
      label: (
        <Flex gap="$8" alignItems="center" justifyContent="space-between">
          <span>{item}</span>
          <Tooltip title={t('core.addressCard.handle.copy.tooltip')}>
            <CopyToClipboard text={item}>
              <CopyIcon
                className={styles.copyButton}
                width={ACTION_ICON_SIZE}
                height={ACTION_ICON_SIZE}
                data-testid="copy-address-btn"
                onClick={doToast}
              />
            </CopyToClipboard>
          </Tooltip>
        </Flex>
      ),
      key: idx,
      icon: adaHandleIcon
    }));

    return <AddressDisplayItem label={items.length} icon={adaHandleIcon} items={items} />;
  }, [metadata, doToast, t]);

  const renderBalanceData = useMemo(() => {
    if (!metadata || !metadata.balance) {
      return;
    }

    return (
      <AddressDisplayItem label={metadata.balance} icon={<AdaSymbolIcon width={ICON_SIZE} height={ICON_SIZE} />} />
    );
  }, [metadata]);

  const getTokenMenuItems = useCallback(
    () => [
      {
        label: `${metadata.tokens.amount} ${t('core.addressCard.tokens.label')}`,
        key: 'tokens',
        icon: <TokensIcon width={ICON_SIZE} height={ICON_SIZE} />
      },
      {
        label: `${metadata.tokens.nfts || 0} ${t('core.addressCard.nfts.label')}`,
        key: 'nfts',
        icon: <NftsIcon width={ICON_SIZE} height={ICON_SIZE} />
      }
    ],
    [metadata, t]
  );

  const renderTokenData = useMemo(() => {
    if (!metadata || !metadata.tokens || metadata.tokens.amount === 0 || isMetadataGrouped) {
      return;
    }

    const items: MenuProps['items'] = getTokenMenuItems();

    const customDropdownRender = (menu: React.ReactElement) => (
      <Box className={styles.customRender}>
        <Box py="$4">{t('core.addressCard.nativeTokens.label')}</Box>
        <Divider h="$1" />
        {React.cloneElement(menu)}
      </Box>
    );

    return (
      <AddressDisplayItem
        label={items.length}
        items={items}
        icon={<AssetsIcon width={ICON_SIZE} height={ICON_SIZE} />}
        dropdownRender={customDropdownRender}
      />
    );
  }, [metadata, isMetadataGrouped, getTokenMenuItems, t]);

  const renderAdditionalData = useMemo(() => {
    if (!metadata) {
      return;
    }

    const items: MenuProps['items'] = Object.keys(metadata)
      .slice(MAX_INLINE_ITEMS - 1)
      .flatMap((item) => {
        if (item === 'tokens') {
          return getTokenMenuItems();
        }

        if (item === 'stakePool') {
          return {
            label: metadata.stakePool,
            key: 'stake-pool',
            icon: <StakePoolIcon width={ICON_SIZE} height={ICON_SIZE} />
          };
        }
      });

    return (
      <AddressDisplayItem
        label={t('core.addressCard.more.label')}
        items={items}
        icon={<MoreIcon className={styles.moreIcon} width={ICON_SIZE} height={ICON_SIZE} />}
      />
    );
  }, [metadata, getTokenMenuItems, t]);

  return (
    <Flex className={classnames(styles.root, highlighted && styles.highlighted)}>
      <div className={styles.qrCodeContainer} data-testid="address-card-qr-code-container">
        <QRCode data={address} options={useMemo(() => getQRCodeOptions?.(), [getQRCodeOptions])} />
      </div>
      <Flex className={styles.infoContainer} flexDirection="column" gap="$8">
        <Flex justifyContent="space-between" alignItems="center" w="$fill">
          {!name && tagWith && (
            <Flex alignItems="center" className={styles.tag}>
              {tagWith.label}
              {tagWith.tooltip && (
                <Tooltip title={tagWith.tooltip}>
                  <InfoCircleOutlined />
                </Tooltip>
              )}
            </Flex>
          )}
          {name && (
            <h6 className={styles.name} data-testid="address-card-name">
              {name}
            </h6>
          )}
          {onCopyClick && (
            <CopyToClipboard text={address}>
              <CopyIcon
                className={styles.copyButton}
                width={ICON_SIZE}
                height={ICON_SIZE}
                data-testid="copy-address-btn"
                onClick={doToast}
              />
            </CopyToClipboard>
          )}
        </Flex>
        <p className={styles.address} data-testid="address-card-address">
          {isPopupView ? addEllipsis(address, ADDRESS_HEAD_ELLIPSIS_LENGTH, ADDRESS_TAIL_ELLIPSIS_LENGTH) : address}
        </p>
        <Flex style={{ flexWrap: 'wrap' }}>
          {isUnused && (
            <AddressDisplayItem
              label={t('core.addressCard.unused.label')}
              icon={<CheckIcon width={ICON_SIZE} height={ICON_SIZE} />}
            />
          )}
          {metadata?.handles?.length > 0 && renderHandleData}
          {renderBalanceData}
          {renderTokenData}
          {metadata?.stakePool && !isMetadataGrouped && (
            <AddressDisplayItem
              label={metadata.stakePool}
              icon={<StakePoolIcon width={ICON_SIZE} height={ICON_SIZE} />}
            />
          )}
          {isMetadataGrouped && renderAdditionalData}
        </Flex>
      </Flex>
    </Flex>
  );
};
