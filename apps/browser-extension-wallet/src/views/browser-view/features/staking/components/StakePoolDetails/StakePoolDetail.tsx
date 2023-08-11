/* eslint-disable react/no-multi-comp */
import React, { useEffect, useMemo, useCallback } from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Banner, Button, Ellipsis } from '@lace/common';
import { StakePoolMetricsBrowser, StakePoolNameBrowser, Wallet } from '@lace/cardano';
import { useDelegationStore, stakePoolDetailsSelector } from '@src/features/delegation/stores';
import { useDelegationDetails } from '@src/hooks';
import { useStakePoolDetails } from '../../store';
import { SocialNetworkIcon, SocialNetwork } from '@views/browser/components';
import styles from './StakePoolDetail.module.scss';
import { useWalletStore } from '@src/stores';

import { useAnalyticsContext } from '@providers';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';

const SATURATION_UPPER_BOUND = 100;
const listItem = [
  'browserView.staking.details.clickOnAPoolFromTheListInTheMainPage',
  'browserView.staking.details.clickOnTheStakeToThisPoolButtonInTheDetailPage',
  'browserView.staking.details.followTheIstructionsInTheStakingFlow'
];

type stakePoolDetailProps = {
  popupView?: boolean;
  setIsStaking: (isStakin: boolean) => void;
};

export const StakePoolDetail = ({ popupView, setIsStaking }: stakePoolDetailProps): React.ReactElement => {
  const {
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
    contact
  } = useDelegationStore(stakePoolDetailsSelector) || {};
  const delegationDetails = useDelegationDetails();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const currentDelegatedStakePool =
    delegationDetails && Wallet.util.stakePoolTransformer({ stakePool: delegationDetails, cardanoCoin });
  const { t } = useTranslation();

  const socialNetworks = [
    { name: SocialNetwork.RSS_FEED, href: contact?.feed },
    { name: SocialNetwork.WEBSITE, href: contact?.primary },
    { name: SocialNetwork.FACEBOOK, href: contact?.facebook },
    { name: SocialNetwork.TELEGRAM, href: contact?.telegram },
    { name: SocialNetwork.GITHUB, href: contact?.github },
    { name: SocialNetwork.TWITTER, href: contact?.twitter }
  ];

  const isDelegatingToThisPool = currentDelegatedStakePool?.id === id;
  useEffect(() => {
    setIsStaking(isDelegatingToThisPool);
  }, [setIsStaking, isDelegatingToThisPool]);

  const metricsTranslations = {
    activeStake: t('cardano.stakePoolMetricsBrowser.activeStake'),
    saturation: t('cardano.stakePoolMetricsBrowser.saturation'),
    delegators: t('cardano.stakePoolMetricsBrowser.delegators'),
    apy: t('cardano.stakePoolMetricsBrowser.ros')
  };

  const statusLogoTranslations = {
    delegating: t('cardano.stakePoolStatusLogo.delegating'),
    saturated: t('cardano.stakePoolStatusLogo.saturated'),
    retiring: t('cardano.stakePoolStatusLogo.retiring'),
    retired: t('cardano.stakePoolStatusLogo.retired')
  };

  return (
    <>
      <div className={cn(styles.contentWrapper, { [styles.popupView]: popupView })}>
        <StakePoolNameBrowser
          {...{
            logo,
            name,
            ticker,
            id,
            status,
            isDelegated: isDelegatingToThisPool,
            isOversaturated: saturation !== undefined && Number(saturation) > SATURATION_UPPER_BOUND
          }}
          translations={statusLogoTranslations}
        />
      </div>
      <div className={cn(styles.container, { [styles.popupView]: popupView })} data-testid="stake-pool-details">
        <div className={cn(styles.contentWrapper, { [styles.popupView]: popupView })}>
          <div className={styles.row}>
            <div className={styles.title} data-testid="stake-pool-details-title">
              {t('browserView.staking.details.statistics.title')}
            </div>
            <StakePoolMetricsBrowser
              popupView={popupView}
              {...{ apy, saturation, stake, delegators }}
              translations={metricsTranslations}
            />
          </div>
          {isDelegatingToThisPool && (
            <Banner
              className={styles.banner}
              withIcon
              message={t(
                'browserView.staking.details.unstakingIsNotYetAvailableFollowTheseStepsIfYouWishToChangeStakePool'
              )}
              description={
                <ul className={styles.descriptionList}>
                  {listItem.map((item, idx) => (
                    <li key={`list-item-${idx}`}>{t(item)}</li>
                  ))}
                </ul>
              }
            />
          )}
          <div className={styles.row} data-testid="stake-pool-details-information">
            <div
              className={styles.title}
              style={{ marginBottom: '24px' }}
              data-testid="stake-pool-details-information-title"
            >
              {t('browserView.staking.details.information.title')}
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
                {t('browserView.staking.details.social.title')}
              </div>
              <div className={styles.social} data-testid="stake-pool-details-social-icons">
                {socialNetworks.map((el) => el.href && <SocialNetworkIcon key={el.name} {...el} />)}
              </div>
            </div>
          )}
          <div className={styles.row} data-testid="stake-pool-details-pool-ids">
            <div className={styles.title} data-testid="stake-pool-details-pool-ids-title">
              {t('browserView.staking.details.poolIds.title')}
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
              'browserView.staking.details.owners.title'
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

type StakePoolDetailFooterProps = {
  onStake: () => void;
  canDelegate?: boolean;
  popupView?: boolean;
};

export const StakePoolDetailFooter = ({
  onStake,
  canDelegate,
  popupView
}: StakePoolDetailFooterProps): React.ReactElement => {
  const { t } = useTranslation();
  const { setNoFundsVisible } = useStakePoolDetails();
  const { id } = useDelegationStore(stakePoolDetailsSelector) || {};
  const {
    getKeyAgentType,
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const analytics = useAnalyticsContext();

  const isInMemory = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory, [getKeyAgentType]);

  const onStakeClick = useCallback(() => {
    if (canDelegate) {
      analytics.sendEventToMatomo({
        category: MatomoEventCategories.STAKING,
        action: MatomoEventActions.CLICK_EVENT,
        name: popupView
          ? AnalyticsEventNames.Staking.STAKE_ON_THIS_POOL_POPUP
          : AnalyticsEventNames.Staking.STAKE_ON_THIS_POOL_BROWSER
      });
      analytics.sendEventToPostHog(PostHogAction.StakingStakePoolDetailStakeOnThisPoolClick);
      onStake();
    } else {
      setNoFundsVisible(true);
    }
  }, [analytics, canDelegate, onStake, popupView, setNoFundsVisible]);

  const delegationDetails = useDelegationDetails();
  const currentDelegatedStakePool =
    delegationDetails && Wallet.util.stakePoolTransformer({ stakePool: delegationDetails, cardanoCoin });
  const isDelegatingToThisPool = currentDelegatedStakePool?.id === id;

  useEffect(() => {
    if (isInMemory) return;
    if (popupView) return;
    const hasPersistedHwStakepool = !!localStorage.getItem('TEMP_POOLID');
    if (!hasPersistedHwStakepool) return;
    onStakeClick();
    localStorage.removeItem('TEMP_POOLID');
  }, [isInMemory, onStakeClick, popupView]);

  return (
    <div className={cn(styles.footer, { [styles.popupView]: popupView })}>
      {!isDelegatingToThisPool && (
        <Button data-testid="stake-pool-details-stake-btn" onClick={onStakeClick} className={styles.stakeBtn}>
          <span>{t('browserView.staking.details.stakeButtonText')}</span>
        </Button>
      )}
    </div>
  );
};
