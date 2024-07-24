/* eslint-disable complexity */
/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable react/no-multi-comp */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { Image, Tooltip } from 'antd';
import cn from 'classnames';
import Icon from '@ant-design/icons';
import { getTextWidth } from '@lace/common';
import { ReactComponent as PendingIcon } from '../../assets/icons/pending.component.svg';
import { ReactComponent as ErrorIcon } from '../../assets/icons/error.component.svg';
import { ReactComponent as AwaitingSignatureIcon } from '../../assets/icons/awaiting-signatures.svg';
import pluralize from 'pluralize';
import { txIconSize } from '@src/ui/utils/icon-size';
import { DelegationActivityType, ConwayEraCertificatesTypes } from '../ActivityDetail/types';
import type { ActivityType } from '../ActivityDetail/types';
import styles from './AssetActivityItem.module.scss';
import { ActivityTypeIcon } from '../ActivityDetail/ActivityTypeIcon';
import { useTranslation } from 'react-i18next';
import { CoreTranslationKey } from '@lace/translation';
import { ActivityStatus, TransactionActivityType } from '@ui/components/Transaction';

export type ActivityAssetInfo = { ticker: string };
export type ActivityAssetProp = { id: string; val: string; info?: ActivityAssetInfo };

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

const DELEGATION_ASSET_NUMBER = 1;

interface ActivityStatusIconProps {
  status: ActivityStatus;
  type: ActivityType;
}

const offsetMargin = 10;

const ActivityStatusIcon = ({ status, type }: ActivityStatusIconProps) => {
  const iconStyle = { fontSize: txIconSize() };
  switch (status) {
    case ActivityStatus.SUCCESS:
      return <ActivityTypeIcon type={type} />;
    case ActivityStatus.SPENDABLE:
      return <ActivityTypeIcon type={TransactionActivityType.rewards} />;
    case ActivityStatus.PENDING:
      return <Icon component={PendingIcon} style={iconStyle} data-testid="activity-status" />;
    case ActivityStatus.AWAITING_COSIGNATURES:
      return <Icon component={AwaitingSignatureIcon} style={iconStyle} data-testid="activity-status" />;
    case ActivityStatus.ERROR:
    default:
      return <Icon component={ErrorIcon} style={iconStyle} data-testid="activity-status" />;
  }
};

const negativeBalanceStyling: Set<Partial<ActivityType>> = new Set([
  TransactionActivityType.outgoing,
  DelegationActivityType.delegationRegistration,
  ConwayEraCertificatesTypes.Registration,
  TransactionActivityType.self,
  DelegationActivityType.delegation,
  TransactionActivityType.awaitingCosignatures
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
      if (
        type in DelegationActivityType ||
        type === ConwayEraCertificatesTypes.Registration ||
        type === ConwayEraCertificatesTypes.Unregistration ||
        type === TransactionActivityType.self
      )
        return { text: amount, suffix: '' };

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
  const isAwaitingCoSigningTx = status === ActivityStatus.AWAITING_COSIGNATURES;
  const assetsText = useMemo(() => getText(assetsToShow), [getText, assetsToShow]);

  const assetAmountContent =
    type in DelegationActivityType ||
    type === ConwayEraCertificatesTypes.Registration ||
    type === ConwayEraCertificatesTypes.Unregistration ? (
      <p data-testid="tokens-amount" className={styles.description}>
        {DELEGATION_ASSET_NUMBER} {t('core.assetActivityItem.entry.token')}
      </p>
    ) : (
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
            {isPendingTx &&
            type !== TransactionActivityType.self &&
            !(type in DelegationActivityType) &&
            type !== ConwayEraCertificatesTypes.Registration &&
            type !== ConwayEraCertificatesTypes.Unregistration
              ? t('core.assetActivityItem.entry.name.sending')
              : t(`core.assetActivityItem.entry.name.${type}` as unknown as CoreTranslationKey)}
          </h6>
          {isAwaitingCoSigningTx ? (
            <p data-testid="timestamp" className={styles.description}>
              {t('core.assetActivityItem.entry.name.awaitingCosignatures')}
            </p>
          ) : (
            descriptionContent
          )}
        </div>
      </div>
      <div data-testid="asset-amount" className={styles.rightSide}>
        <h6
          data-testid="total-amount"
          className={cn(styles.title, {
            [styles.pendingNegativeBalance]: isNegativeBalance && (isPendingTx || isAwaitingCoSigningTx),
            [styles.positiveBalance]: !isNegativeBalance,
            [styles.negativeBalance]: isNegativeBalance && (isPendingTx || isAwaitingCoSigningTx)
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
