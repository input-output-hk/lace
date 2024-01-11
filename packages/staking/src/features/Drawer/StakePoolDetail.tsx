/* eslint-disable react/no-multi-comp */
import { StakePoolMetricsBrowser, StakePoolNameBrowser, Wallet } from '@lace/cardano';
import { Ellipsis, PostHogAction } from '@lace/common';
import { Button, Flex } from '@lace/ui';
import cn from 'classnames';
import { TFunction } from 'i18next';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import {
  DelegationPortfolioStore,
  MAX_POOLS_COUNT,
  StakePoolDetails,
  stakePoolDetailsSelector,
  useDelegationPortfolioStore,
} from '../store';
import { SocialNetwork, SocialNetworkIcon } from './SocialNetworks';
import styles from './StakePoolDetail.module.scss';

const SATURATION_UPPER_BOUND = 100;

export const StakePoolDetail = ({ popupView }: { popupView?: boolean }): React.ReactElement => {
  const { t } = useTranslation();
  const { openExternalLink } = useOutsideHandles();
  const { cardanoCoinSymbol } = useDelegationPortfolioStore((store) => ({
    cardanoCoinSymbol: store.cardanoCoinSymbol,
  }));
  const {
    delegatingToThisPool,
    details: {
      delegators,
      description,
      id,
      hexId,
      owners = [],
      apy,
      saturation,
      stake,
      logo,
      name,
      ticker,
      status,
      contact,
      blocks,
      costsPerEpoch,
      pledge,
      margin,
    },
  } = useDelegationPortfolioStore((store) => ({
    delegatingToThisPool:
      store.viewedStakePool?.hexId &&
      store.currentPortfolio
        .map((portfolioItem) => portfolioItem.id)
        .includes(Wallet.Cardano.PoolIdHex(store.viewedStakePool?.hexId)),
    details: stakePoolDetailsSelector(store) || ({} as StakePoolDetails),
  }));

  const socialNetworks = [
    { href: contact?.feed, type: SocialNetwork.RSS_FEED },
    { href: contact?.primary, type: SocialNetwork.WEBSITE },
    { href: contact?.facebook, type: SocialNetwork.FACEBOOK },
    { href: contact?.telegram, type: SocialNetwork.TELEGRAM },
    { href: contact?.github, type: SocialNetwork.GITHUB },
    { href: contact?.twitter, type: SocialNetwork.TWITTER },
  ];

  const metricsTranslations = {
    activeStake: t('drawer.details.metrics.activeStake'),
    apy: t('drawer.details.metrics.apy'),
    blocks: t('drawer.details.metrics.blocks'),
    cost: t('drawer.details.metrics.cost'),
    delegators: t('drawer.details.metrics.delegators'),
    margin: t('drawer.details.metrics.margin'),
    pledge: t('drawer.details.metrics.pledge'),
    saturation: t('drawer.details.metrics.saturation'),
  };

  const statusLogoTranslations = {
    delegating: t('drawer.details.status.delegating'),
    retired: t('drawer.details.status.retired'),
    retiring: t('drawer.details.status.retiring'),
    saturated: t('drawer.details.status.saturated'),
  };

  const metricsData = [
    { t: metricsTranslations.apy, testId: 'apy', unit: '%', value: apy || '-' },
    { t: metricsTranslations.delegators, testId: 'delegators', value: delegators || '-' },
    { t: metricsTranslations.saturation, testId: 'saturation', unit: '%', value: saturation || '-' },
    { t: metricsTranslations.activeStake, testId: 'active-stake', unit: stake.unit, value: stake.number },
    { t: metricsTranslations.blocks, testId: 'blocks', value: blocks },
    { t: metricsTranslations.cost, testId: 'cost', unit: '%', value: costsPerEpoch },
    { t: metricsTranslations.pledge, testId: 'pledge', unit: cardanoCoinSymbol, value: pledge },
    { t: metricsTranslations.margin, testId: 'margin', unit: '%', value: margin },
  ];

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
      <div className={cn(styles.contentWrapper, { [styles.popupView!]: popupView })}>
        <StakePoolNameBrowser
          {...{
            id,
            isDelegated: delegatingToThisPool,
            isOversaturated: saturation !== undefined && Number(saturation) > SATURATION_UPPER_BOUND,
            logo,
            name,
            status,
            ticker,
          }}
          translations={statusLogoTranslations}
        />
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
      <div className={cn(styles.container, { [styles.popupView!]: popupView })} data-testid="stake-pool-details">
        {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
        <div className={cn(styles.contentWrapper, { [styles.popupView!]: popupView })}>
          <div className={styles.row}>
            <div className={styles.title} data-testid="stake-pool-details-title">
              {t('drawer.details.statistics')}
            </div>
            <StakePoolMetricsBrowser data={metricsData} popupView={popupView} />
          </div>
          <div className={styles.row} data-testid="stake-pool-details-information">
            <div
              className={styles.title}
              style={{ marginBottom: '24px' }}
              data-testid="stake-pool-details-information-title"
            >
              {t('drawer.details.information')}
            </div>
            <div className={styles.body} data-testid="stake-pool-details-information-description">
              {description}
            </div>
          </div>
          {socialNetworks.some((sns) => sns.href) && (
            <div className={styles.row} style={{ marginBottom: '5px' }} data-testid="stake-pool-details-social">
              <div
                className={styles.title}
                style={{ marginBottom: '24px' }}
                data-testid="stake-pool-details-social-title"
              >
                {t('drawer.details.social')}
              </div>
              <div className={styles.social} data-testid="stake-pool-details-social-icons">
                {socialNetworks.map(
                  ({ type, href }) =>
                    href && <SocialNetworkIcon key={type} name={type} href={href} onClick={openExternalLink} />
                )}
              </div>
            </div>
          )}
          <div className={styles.row} data-testid="stake-pool-details-pool-ids">
            <div className={styles.title} data-testid="stake-pool-details-pool-ids-title">
              {t('drawer.details.poolIds')}
            </div>
            <div>
              <div className={styles.id} data-testid="stake-pool-details-pool-id">
                {id}
              </div>
              <div className={styles.id} data-testid="stake-pool-details-pool-id-hex">
                {hexId}
              </div>
            </div>
          </div>
          <div className={styles.row} style={{ marginBottom: '40px' }} data-testid="stake-pool-details-owners">
            <div className={styles.title} data-testid="stake-pool-details-owners-title">{`${t(
              'drawer.details.owners'
            )} (${owners.length})`}</div>
            {owners.map((address) => (
              <div key={address.toString()} className={styles.owner} data-testid="stake-pool-details-owner">
                <span className={styles.ownerAddress}>
                  <Ellipsis
                    text={address.toString()}
                    textClassName={styles.addressEllipsis}
                    className={styles.addressEllipsisParent}
                    ellipsisInTheMiddle
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export type StakePoolDetailFooterProps = {
  popupView?: boolean;
};

const makeSelector =
  (openPool?: StakePoolDetails) =>
  ({ currentPortfolio, selectedPortfolio }: DelegationPortfolioStore) => {
    const poolInCurrentPortfolio =
      !!openPool && currentPortfolio.some(({ id }) => id === Wallet.Cardano.PoolIdHex(openPool.hexId));
    const poolSelected =
      !!openPool && selectedPortfolio.some(({ id }) => id === Wallet.Cardano.PoolIdHex(openPool.hexId));
    const selectionsFull = selectedPortfolio.length === MAX_POOLS_COUNT;

    return {
      ableToSelect: !poolSelected && !selectionsFull,
      ableToStakeOnlyOnThisPool: !poolInCurrentPortfolio || currentPortfolio.length > 1,
      poolInCurrentPortfolio,
      poolSelected,
      selectionsEmpty: selectedPortfolio.length === 0,
    };
  };

type ActionButtonSpec = { callback: () => void; dataTestId: string; label: string };
type ButtonNames = 'addStakingPool' | 'manageDelegation' | 'stakeOnThisPool' | 'selectForMultiStaking' | 'unselectPool';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const tmpNoop = () => {};
const getSpecOverride = (specOrBool: Partial<ActionButtonSpec> | boolean) =>
  typeof specOrBool === 'boolean' ? {} : specOrBool;

const makeActionButtons = (
  t: TFunction,
  {
    addStakingPool,
    manageDelegation,
    selectForMultiStaking,
    stakeOnThisPool,
    unselectPool,
  }: Record<ButtonNames, boolean | Partial<ActionButtonSpec>>
): ActionButtonSpec[] =>
  (
    [
      manageDelegation && {
        callback: tmpNoop,
        dataTestId: 'stake-pool-details-manage-delegation-btn',
        label: t('drawer.details.manageDelegation'),
        ...getSpecOverride(manageDelegation),
      },
      stakeOnThisPool && {
        callback: tmpNoop,
        dataTestId: 'stake-pool-details-stake-btn',
        label: t('drawer.details.stakeOnPoolButton'),
        ...getSpecOverride(stakeOnThisPool),
      },
      selectForMultiStaking && {
        callback: tmpNoop,
        dataTestId: 'stake-pool-details-select-for-multi-staking-btn',
        label: t('drawer.details.selectForMultiStaking'),
        ...getSpecOverride(selectForMultiStaking),
      },
      addStakingPool && {
        callback: tmpNoop,
        dataTestId: 'stake-pool-details-add-staking-pool-btn',
        label: t('drawer.details.addStakingPool'),
        ...getSpecOverride(addStakingPool),
      },
      unselectPool && {
        callback: tmpNoop,
        dataTestId: 'stake-pool-details-unselect-pool-btn',
        label: t('drawer.details.unselectPool'),
        ...getSpecOverride(unselectPool),
      },
    ] as (ActionButtonSpec | false)[]
  ).filter(Boolean) as ActionButtonSpec[];

export const StakePoolDetailFooter = ({ popupView }: StakePoolDetailFooterProps): React.ReactElement => {
  const { t } = useTranslation();
  const { analytics } = useOutsideHandles();
  const { walletStoreGetKeyAgentType } = useOutsideHandles();
  const { openPoolDetails, portfolioMutators, viewedStakePool } = useDelegationPortfolioStore((store) => ({
    openPoolDetails: stakePoolDetailsSelector(store),
    portfolioMutators: store.mutators,
    viewedStakePool: store.viewedStakePool,
  }));
  const { ableToSelect, ableToStakeOnlyOnThisPool, selectionsEmpty, poolInCurrentPortfolio, poolSelected } =
    useDelegationPortfolioStore(makeSelector(openPoolDetails));

  const isInMemory = useMemo(
    () => walletStoreGetKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory,
    [walletStoreGetKeyAgentType]
  );

  const onStakeOnThisPool = useCallback(() => {
    analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakePoolDetailStakeAllOnThisPoolClick);
    portfolioMutators.executeCommand({ type: 'BeginSingleStaking' });
  }, [analytics, portfolioMutators]);

  useEffect(() => {
    if (isInMemory) return;
    if (popupView) return;
    const hasPersistedHwStakepool = !!localStorage.getItem('TEMP_POOLID');
    if (!hasPersistedHwStakepool) return;
    onStakeOnThisPool();
    localStorage.removeItem('TEMP_POOLID');
  }, [isInMemory, onStakeOnThisPool, popupView]);

  const onSelectClick = useCallback(() => {
    if (!viewedStakePool) return;
    analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakePoolDetailAddStakingPoolClick);
    portfolioMutators.executeCommand({
      data: viewedStakePool,
      type: 'SelectPoolFromDetails',
    });
  }, [viewedStakePool, portfolioMutators, analytics]);

  const onUnselectClick = useCallback(() => {
    if (!viewedStakePool) return;
    analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakePoolDetailUnselectPoolClick);
    portfolioMutators.executeCommand({
      data: Wallet.Cardano.PoolIdHex(viewedStakePool.hexId),
      type: 'UnselectPoolFromDetails',
    });
  }, [viewedStakePool, analytics, portfolioMutators]);

  const onManageDelegationClick = useCallback(() => {
    if (!viewedStakePool) return;
    analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakePoolDetailManageDelegation);
    portfolioMutators.executeCommand({
      type: 'ManageDelegationFromDetails',
    });
  }, [viewedStakePool, analytics, portfolioMutators]);

  const actionButtons = useMemo(
    () =>
      makeActionButtons(t, {
        addStakingPool: ableToSelect && !selectionsEmpty && { callback: onSelectClick },
        manageDelegation: poolInCurrentPortfolio && { callback: onManageDelegationClick },
        selectForMultiStaking: ableToSelect && selectionsEmpty && { callback: onSelectClick },
        stakeOnThisPool: selectionsEmpty && ableToStakeOnlyOnThisPool && { callback: onStakeOnThisPool },
        unselectPool: poolSelected && { callback: onUnselectClick },
      }),
    [
      t,
      ableToSelect,
      selectionsEmpty,
      onManageDelegationClick,
      onSelectClick,
      poolInCurrentPortfolio,
      ableToStakeOnlyOnThisPool,
      onStakeOnThisPool,
      poolSelected,
      onUnselectClick,
    ]
  );

  if (actionButtons.length === 0) return <></>;

  const [callToActionButton, ...secondaryButtons] = actionButtons;

  return (
    <Flex flexDirection="column" alignItems="stretch" gap="$16">
      {callToActionButton && (
        <Button.CallToAction
          label={callToActionButton.label}
          data-testid={callToActionButton.dataTestId}
          onClick={callToActionButton.callback}
          w="$fill"
        />
      )}
      {secondaryButtons.map(({ callback, dataTestId, label }) => (
        <Button.Secondary key={dataTestId} onClick={callback} data-testid={dataTestId} label={label} w="$fill" />
      ))}
    </Flex>
  );
};
