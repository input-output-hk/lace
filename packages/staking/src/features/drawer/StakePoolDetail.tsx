/* eslint-disable react/no-multi-comp */
import { StakePoolMetricsBrowser, StakePoolNameBrowser, Wallet } from '@lace/cardano';
import { Banner, Button, Ellipsis } from '@lace/common';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useStakePoolDetails } from '../store';
import { SocialNetwork, SocialNetworkIcon } from './SocialNetworks';
import styles from './StakePoolDetail.module.scss';

const SATURATION_UPPER_BOUND = 100;

type stakePoolDetailProps = {
  setIsStaking: (isStakin: boolean) => void;
};

export const StakePoolDetail = ({ setIsStaking }: stakePoolDetailProps): React.ReactElement => {
  const {
    delegationDetails,
    delegationStoreSelectedStakePoolDetails: {
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
    },
    openExternalLink,
    walletStoreWalletUICardanoCoin,
  } = useOutsideHandles();
  const currentDelegatedStakePool =
    delegationDetails &&
    Wallet.util.stakePoolTransformer({ cardanoCoin: walletStoreWalletUICardanoCoin, stakePool: delegationDetails });
  const { t } = useTranslation();

  const socialNetworks = [
    { href: contact?.feed, type: SocialNetwork.RSS_FEED },
    { href: contact?.primary, type: SocialNetwork.WEBSITE },
    { href: contact?.facebook, type: SocialNetwork.FACEBOOK },
    { href: contact?.telegram, type: SocialNetwork.TELEGRAM },
    { href: contact?.github, type: SocialNetwork.GITHUB },
    { href: contact?.twitter, type: SocialNetwork.TWITTER },
  ];

  const isDelegatingToThisPool = currentDelegatedStakePool?.id === id;
  useEffect(() => {
    setIsStaking(isDelegatingToThisPool);
  }, [setIsStaking, isDelegatingToThisPool]);

  const metricsTranslations = {
    activeStake: t('drawer.details.metrics.activeStake'),
    apy: t('drawer.details.metrics.apy'),
    delegators: t('drawer.details.metrics.delegators'),
    saturation: t('drawer.details.metrics.saturation'),
  };

  const statusLogoTranslations = {
    delegating: t('drawer.details.status.delegating'),
    retired: t('drawer.details.status.retired'),
    retiring: t('drawer.details.status.retiring'),
    saturated: t('drawer.details.status.saturated'),
  };

  return (
    <>
      <div className={styles.contentWrapper}>
        <StakePoolNameBrowser
          {...{
            id,
            isDelegated: isDelegatingToThisPool,
            isOversaturated: saturation !== undefined && Number(saturation) > SATURATION_UPPER_BOUND,
            logo,
            name,
            status,
            ticker,
          }}
          translations={statusLogoTranslations}
        />
      </div>
      <div className={styles.container} data-testid="stake-pool-details">
        <div className={styles.contentWrapper}>
          <div className={styles.row}>
            <div className={styles.title} data-testid="stake-pool-details-title">
              {t('drawer.details.statistics')}
            </div>
            <StakePoolMetricsBrowser {...{ apy, delegators, saturation, stake }} translations={metricsTranslations} />
          </div>
          {isDelegatingToThisPool && (
            <Banner
              className={styles.banner}
              withIcon
              message={t('drawer.details.switchingPoolBanner.title')}
              description={
                <ul className={styles.descriptionList}>
                  <li>{t('drawer.details.switchingPoolBanner.description.step1')}</li>
                  <li>{t('drawer.details.switchingPoolBanner.description.step2')}</li>
                  <li>{t('drawer.details.switchingPoolBanner.description.step3')}</li>
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

type StakePoolDetailFooterProps = {
  onStake: () => void;
  canDelegate?: boolean;
};

export const StakePoolDetailFooter = ({ onStake, canDelegate }: StakePoolDetailFooterProps): React.ReactElement => {
  const { t } = useTranslation();
  const { setNoFundsVisible } = useStakePoolDetails();
  const {
    delegationDetails,
    delegationStoreSelectedStakePoolDetails: { id },
    walletStoreGetKeyAgentType,
    walletStoreWalletUICardanoCoin,
  } = useOutsideHandles();

  const isInMemory = useMemo(
    () => walletStoreGetKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory,
    [walletStoreGetKeyAgentType]
  );

  const onStakeClick = useCallback(() => {
    if (canDelegate) {
      onStake();
    } else {
      setNoFundsVisible(true);
    }
  }, [canDelegate, onStake, setNoFundsVisible]);

  const currentDelegatedStakePool =
    delegationDetails &&
    Wallet.util.stakePoolTransformer({ cardanoCoin: walletStoreWalletUICardanoCoin, stakePool: delegationDetails });
  const isDelegatingToThisPool = currentDelegatedStakePool?.id === id;

  useEffect(() => {
    if (isInMemory) return;
    const hasPersistedHwStakepool = !!localStorage.getItem('TEMP_POOLID');
    if (!hasPersistedHwStakepool) return;
    onStakeClick();
    localStorage.removeItem('TEMP_POOLID');
  }, [isInMemory, onStakeClick]);

  return (
    <div className={styles.footer}>
      {!isDelegatingToThisPool && (
        <Button data-testid="stake-pool-details-stake-btn" onClick={onStakeClick} className={styles.stakeBtn}>
          <span>{t('drawer.details.stakeOnPoolButton')}</span>
        </Button>
      )}
    </div>
  );
};
