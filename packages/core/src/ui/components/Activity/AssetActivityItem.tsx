/* eslint-disable react/no-multi-comp */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { Image, Tooltip } from 'antd';
import cn from 'classnames';
import Icon from '@ant-design/icons';
import { getTextWidth } from '@lace/common';
import { ReactComponent as PendingIcon } from '../../assets/icons/pending.component.svg';
import { ReactComponent as ErrorIcon } from '../../assets/icons/error.component.svg';
import styles from './AssetActivityItem.module.scss';
import pluralize from 'pluralize';
import { txIconSize } from '@src/ui/utils/icon-size';
import { useTranslate } from '@src/ui/hooks';
import { ActivityTypeIcon, ActivityType } from '../ActivityDetail';

export type ActivityAssetInfo = { ticker: string };
export type ActivityAssetProp = { id: string; val: string; info?: ActivityAssetInfo };

export enum ActivityStatus {
  SUCCESS = 'success',
  PENDING = 'sending',
  ERROR = 'error',
  SPENDABLE = 'spendable'
}

const DEFAULT_DEBOUNCE = 200;

export interface AssetActivityItemProps {
  id?: string;
  /**
   * Amount formated with symbol (e.g. 50 ADA)
   */
  amount: string;
  /**
   * Amount in Fiat currency (e.g. 125$)
   */
  fiatAmount: string;
  /**
   * Action to be executed when clicking on the item
   */
  onClick?: () => unknown;
  /**
   * Activity status: `sending` | `success` | 'error
   */
  status?: ActivityStatus;
  /**
   * Activity or asset custom icon
   */
  customIcon?: string;
  /**
   * Activity type
   */
  type?: ActivityType;
  /**
   * Number of assets (default: 1)
   */
  assetsNumber?: number;
  formattedTimestamp: string;
  /**
   * assets details
   */
  assets?: ActivityAssetProp[];
}

const DelegationTransactionTypes = new Set(['delegation', 'delegationRegistration', 'delegationDeregistration']);
const DELEGATION_ASSET_NUMBER = 1;

interface ActivityStatusIconProps {
  status: string;
  type: ActivityType;
}

const offsetMargin = 10;

const ActivityStatusIcon = ({ status, type }: ActivityStatusIconProps) => {
  const iconStyle = { fontSize: txIconSize() };
  switch (status) {
    case ActivityStatus.SUCCESS:
      return <ActivityTypeIcon type={type} />;
    case ActivityStatus.SPENDABLE:
      return <ActivityTypeIcon type="rewards" />;
    case ActivityStatus.PENDING:
      return <Icon component={PendingIcon} style={iconStyle} data-testid="activity-status" />;
    case ActivityStatus.ERROR:
    default:
      return <Icon component={ErrorIcon} style={iconStyle} data-testid="activity-status" />;
  }
};

const translationTypes = {
  delegation: 'package.core.assetActivityItem.entry.name.delegation',
  delegationDeregistration: 'package.core.assetActivityItem.entry.name.delegationDeregistration',
  delegationRegistration: 'package.core.assetActivityItem.entry.name.delegationRegistration',
  rewards: 'package.core.assetActivityItem.entry.name.rewards',
  incoming: 'package.core.assetActivityItem.entry.name.incoming',
  outgoing: 'package.core.assetActivityItem.entry.name.outgoing',
  self: 'package.core.assetActivityItem.entry.name.self'
};

const negativeBalanceStyling: Set<ActivityType> = new Set(['outgoing', 'delegationRegistration', 'self', 'delegation']);

// TODO: Handle pluralization and i18n of assetsNumber when we will have more than Ada.
export const AssetActivityItem = ({
  amount,
  fiatAmount,
  onClick,
  status,
  customIcon,
  type,
  assetsNumber = 1,
  assets,
  formattedTimestamp
}: AssetActivityItemProps): React.ReactElement => {
  const { t } = useTranslate();
  const ref = useRef<HTMLHeadingElement>(null);
  const [assetsToShow, setAssetsToShow] = React.useState<number>(0);

  const getText = useCallback(
    (items: number): { text: string; suffix: string } => {
      if (DelegationTransactionTypes.has(type) || type === 'self') return { text: amount, suffix: '' };

      const assetsIdsText = assets
        ?.slice(0, items)
        .map(({ val, info }) => `${val} ${info?.ticker || '"?"'}`)
        .join(', ');
      const suffix = assets?.length - items > 0 ? `, +${assets.length - items}` : '';
      const appendedAssetId = assetsIdsText ? `, ${assetsIdsText}` : '';
      return {
        text: `${amount}${appendedAssetId}`,
        suffix: suffix && ` ${suffix}`
      };
    },
    [assets, amount, type]
  );

  const setText = useCallback(() => {
    if (!assets || assets.length === 0) return;
    let items = assets.length;
    let text = getText(items);
    while (
      ref &&
      ref.current &&
      items > 0 &&
      getTextWidth(`${text.text}${text.suffix}`, ref.current) > ref.current.offsetWidth - offsetMargin
    ) {
      items -= 1;
      text = getText(items);
    }
    if (ref?.current) setAssetsToShow(items);
  }, [assets, getText]);

  const debouncedSetText = useMemo(() => debounce(setText, DEFAULT_DEBOUNCE), [setText]);

  useEffect(() => {
    window.addEventListener('resize', debouncedSetText);
    debouncedSetText();
    return () => {
      window.removeEventListener('resize', debouncedSetText);
    };
  }, [debouncedSetText]);

  const isPendingTx = status === ActivityStatus.PENDING;
  const assetsText = useMemo(() => getText(assetsToShow), [getText, assetsToShow]);

  const assetAmountContent = DelegationTransactionTypes.has(type) ? (
    <p data-testid="tokens-amount" className={styles.description}>
      {DELEGATION_ASSET_NUMBER} {t('package.core.assetActivityItem.entry.token')}
    </p>
  ) : (
    <p data-testid="tokens-amount" className={styles.description}>
      {pluralize('package.core.assetActivityItem.entry.token', assetsNumber, true)}
    </p>
  );
  const descriptionContent = formattedTimestamp ? (
    <p data-testid="timestamp" className={styles.description}>
      {formattedTimestamp}
    </p>
  ) : (
    assetAmountContent
  );

  const isNegativeBalance = negativeBalanceStyling.has(type);

  return (
    <div data-testid="asset-activity-item" onClick={onClick} className={styles.assetActivityItem}>
      <div className={styles.leftSide}>
        <div data-testid="asset-icon" className={styles.iconWrapper}>
          {customIcon ? (
            <Image src={customIcon} className={styles.icon} preview={false} alt="asset image" />
          ) : (
            <ActivityStatusIcon status={status} type={type} />
          )}
        </div>
        <div data-testid="asset-info" className={styles.info}>
          <h6 data-testid="transaction-type" className={styles.title}>
            {isPendingTx && type !== 'self' && !DelegationTransactionTypes.has(type)
              ? t('package.core.assetActivityItem.entry.name.sending')
              : t(translationTypes[type])}
          </h6>
          {descriptionContent}
        </div>
      </div>
      <div data-testid="asset-amount" className={styles.rightSide}>
        <h6
          data-testid="total-amount"
          className={cn(styles.title, {
            [styles.negativeBalance]: isNegativeBalance,
            [styles.positiveBalance]: !isNegativeBalance
          })}
          ref={ref}
        >
          <span>
            <span data-testid="balance">
              {isNegativeBalance ? '-' : ''}
              {assetsText.text}
            </span>
            {assetsText.suffix && (
              <Tooltip
                overlayClassName={styles.tooltip}
                title={
                  <>
                    {assets?.slice(assetsToShow, assets.length).map(({ id, val, info }) => (
                      <div key={id} className={styles.tooltipItem}>{`${val} ${info?.ticker || '?'}`}</div>
                    ))}
                  </>
                }
              >
                {assetsText.suffix}
              </Tooltip>
            )}
          </span>
        </h6>
        <p data-testid="fiat-amount" className={styles.description}>
          {fiatAmount}
        </p>
      </div>
    </div>
  );
};
