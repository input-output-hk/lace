/* eslint-disable complexity */
/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable react/no-multi-comp */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-magic-numbers */
/* eslint-disable consistent-return */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { Image, Tooltip } from 'antd';
import cn from 'classnames';
import { getTextWidth } from '@lace/common';
import pluralize from 'pluralize';
import styles from './AssetActivityItem.module.scss';
import { ActivityTypeIcon } from '@lace/core';
import { useTranslation } from 'react-i18next';
import { CoreTranslationKey } from '@lace/translation';

export type ActivityAssetInfo = { ticker: string };
export type ActivityAssetProp = { id: string; val: string; info?: ActivityAssetInfo };

const DEFAULT_DEBOUNCE = 200;

export enum ActivityStatus {
  SUCCESS = 'success',
  PENDING = 'sending',
  ERROR = 'error',
  SPENDABLE = 'spendable'
}

export enum TransactionActivityType {
  'outgoing' = 'outgoing',
  'incoming' = 'incoming',
  'self' = 'self',
  'rewards' = 'rewards',
  'pending' = 'pending',
  'awaitingCosignatures' = 'awaitingCosignatures'
}

export const txIconSize = (): string => (window.innerWidth <= 360 ? '40px' : '48px');

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
  type?: TransactionActivityType;
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

interface ActivityStatusRequiringType {
  status: ActivityStatus.SUCCESS;
  type: TransactionActivityType;
}

interface ActivityStatusNotRequiringType {
  status: ActivityStatus.SPENDABLE | ActivityStatus.ERROR | ActivityStatus.PENDING;
  type?: TransactionActivityType;
}

type ActivityStatusIconProps = ActivityStatusRequiringType | ActivityStatusNotRequiringType;

const offsetMargin = 10;

const ActivityStatusIcon = ({ status, type }: ActivityStatusIconProps) => {
  switch (status) {
    case ActivityStatus.SUCCESS:
      return <ActivityTypeIcon type={type} />;
    case ActivityStatus.SPENDABLE:
      return <ActivityTypeIcon type={TransactionActivityType.rewards} />;
    case ActivityStatus.PENDING:
      return <ActivityTypeIcon type={TransactionActivityType.pending} />;
  }
};

const negativeBalanceStyling: Set<Partial<TransactionActivityType>> = new Set([
  TransactionActivityType.outgoing,
  TransactionActivityType.self
]);

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
  const { t } = useTranslation();
  const ref = useRef<HTMLHeadingElement>(null);
  const [assetsToShow, setAssetsToShow] = React.useState<number>(0);

  const getText = useCallback(
    (items: number): { text: string; suffix: string } => {
      if (type === TransactionActivityType.self) return { text: amount, suffix: '' };

      const assetsIdsText = assets
        ?.slice(0, items)
        .map(({ val, info }) => `${val} ${info?.ticker ?? '"?"'}`)
        .join(', ');
      const suffix = assets && assets?.length - items > 0 ? `, +${assets.length - items}` : '';
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

  const assetAmountContent = (
    <p data-testid="tokens-amount" className={styles.description}>
      {pluralize('core.assetActivityItem.entry.token', assetsNumber, true)}
    </p>
  );
  const descriptionContent = formattedTimestamp ? (
    <p data-testid="timestamp" className={styles.description}>
      {formattedTimestamp}
    </p>
  ) : (
    assetAmountContent
  );

  const isNegativeBalance = type && negativeBalanceStyling.has(type);

  return (
    <div data-testid="asset-activity-item" onClick={onClick} className={styles.assetActivityItem}>
      <div className={styles.leftSide}>
        <div data-testid="asset-icon" className={styles.iconWrapper}>
          {customIcon ? (
            <Image src={customIcon} className={styles.icon} preview={false} alt="asset image" />
          ) : (
            type && <ActivityStatusIcon status={status ?? ActivityStatus.ERROR} type={type} />
          )}
        </div>
        <div data-testid="asset-info" className={styles.info}>
          <h6 data-testid="transaction-type" className={styles.title}>
            {t(`core.assetActivityItem.entry.name.${type}` as unknown as CoreTranslationKey)}
          </h6>
          {descriptionContent}
        </div>
      </div>
      <div data-testid="asset-amount" className={styles.rightSide}>
        <h6
          data-testid="total-amount"
          className={cn(styles.title, {
            [styles.pendingNegativeBalance]: isNegativeBalance && isPendingTx,
            [styles.positiveBalance]: !isNegativeBalance,
            [styles.negativeBalance]: isNegativeBalance && isPendingTx
          })}
          ref={ref}
        >
          <span>
            <span data-testid="balance">{assetsText.text}</span>
            {assetsText.suffix && (
              <Tooltip
                overlayClassName={styles.tooltip}
                title={
                  <>
                    {assets
                      ?.slice(assetsToShow, assets.length)
                      .map(({ id, val, info }) => (
                        <div key={id} className={styles.tooltipItem}>{`${val} ${info?.ticker ?? '?'}`}</div>
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
