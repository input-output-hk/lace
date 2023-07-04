/* eslint-disable react/no-multi-comp */
import { StakePoolMetricsBrowser, StakePoolNameBrowser, Wallet } from '@lace/cardano';
import { Banner, Ellipsis } from '@lace/common';
import { Button, Flex } from '@lace/ui';
import { TFunction } from 'i18next';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { SelectedStakePoolDetails } from '../outside-handles-provider/types';
import { useDelegationPortfolioStore, useStakePoolDetails } from '../store';
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

type SelectorParams = Parameters<Parameters<typeof useDelegationPortfolioStore>[0]>[0];

const makeSelector =
  (selectedPool: SelectedStakePoolDetails) =>
  ({ currentPortfolio, draftPortfolio }: SelectorParams) => {
    const poolInCurrentPortfolio = currentPortfolio.some(({ id }) => id === selectedPool.id);
    const poolSelectedForDraft = draftPortfolio.some(({ id }) => id === selectedPool.id);
    // TODO: use max pools count constant here
    // eslint-disable-next-line no-magic-numbers
    const draftFull = draftPortfolio.length === 5;

    return {
      ableToSelectForDraft: !poolSelectedForDraft && !draftFull,
      ableToStakeOnlyOnThisPool: !poolInCurrentPortfolio || currentPortfolio.length > 1,
      draftEmpty: draftPortfolio.length === 0,
      draftFull,
      poolSelectedForDraft,
    };
  };

type ActionButtonSpec = { callback: () => void; dataTestId: string; label: string };
type ButtonNames = 'addStakingPool' | 'manageDelegation' | 'stakeOnThisPool' | 'selectForMultiStaking' | 'unselectPool';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const tmpNoop = () => {};
const getSpecOverride = (specOrBool: Partial<ActionButtonSpec> | boolean) =>
  typeof specOrBool === 'boolean' ? {} : specOrBool;
// TODO: translations for buttons labels
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
      stakeOnThisPool && {
        callback: tmpNoop,
        dataTestId: 'stake-pool-details-stake-btn',
        label: t('drawer.details.stakeOnPoolButton'),
        ...getSpecOverride(stakeOnThisPool),
      },
      selectForMultiStaking && {
        callback: tmpNoop,
        dataTestId: 'stake-pool-details-select-for-multi-staking-btn',
        label: 'Select pool for multi-staking',
        ...getSpecOverride(selectForMultiStaking),
      },
      addStakingPool && {
        callback: tmpNoop,
        dataTestId: 'stake-pool-details-add-staking-pool-btn',
        label: 'Add staking pool',
        ...getSpecOverride(addStakingPool),
      },
      unselectPool && {
        callback: tmpNoop,
        dataTestId: 'stake-pool-details-unselect-pool-btn',
        label: 'Unselect pool',
        ...getSpecOverride(unselectPool),
      },
      manageDelegation && {
        callback: tmpNoop,
        dataTestId: 'stake-pool-details-manage-delegation-btn',
        label: 'Manage delegation',
        ...getSpecOverride(manageDelegation),
      },
    ] as (ActionButtonSpec | false)[]
  ).filter(Boolean) as ActionButtonSpec[];

export const StakePoolDetailFooter = ({ onStake, canDelegate }: StakePoolDetailFooterProps): React.ReactElement => {
  const { t } = useTranslation();
  const { setNoFundsVisible } = useStakePoolDetails();
  const { delegationStoreSelectedStakePoolDetails: poolDetails, walletStoreGetKeyAgentType } = useOutsideHandles();
  const { ableToSelectForDraft, ableToStakeOnlyOnThisPool, draftEmpty, draftFull, poolSelectedForDraft } =
    useDelegationPortfolioStore(makeSelector(poolDetails));
  const portfolioMutators = useDelegationPortfolioStore((s) => s.mutators);

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

  const onSelectPool = useCallback(() => {
    const { id, name, ticker } = poolDetails;
    portfolioMutators.addPoolToDraft({
      id,
      name,
      ticker,
      weight: 1,
    });
  }, [poolDetails, portfolioMutators]);

  useEffect(() => {
    if (isInMemory) return;
    const hasPersistedHwStakepool = !!localStorage.getItem('TEMP_POOLID');
    if (!hasPersistedHwStakepool) return;
    onStakeClick();
    localStorage.removeItem('TEMP_POOLID');
  }, [isInMemory, onStakeClick]);

  const [callToActionButton, ...secondaryButtons] = useMemo(
    () =>
      makeActionButtons(t, {
        addStakingPool: ableToSelectForDraft && !draftEmpty && { callback: onStake },
        manageDelegation: draftFull,
        selectForMultiStaking: ableToSelectForDraft && draftEmpty && { callback: onSelectPool },
        stakeOnThisPool: ableToStakeOnlyOnThisPool,
        unselectPool: poolSelectedForDraft,
      }),
    [
      t,
      ableToSelectForDraft,
      draftEmpty,
      onStake,
      draftFull,
      onSelectPool,
      ableToStakeOnlyOnThisPool,
      poolSelectedForDraft,
    ]
  );

  return (
    <Flex flexDirection={'column'} alignItems={'stretch'} gap={'$16'}>
      {callToActionButton && (
        <Button.CallToAction
          label={callToActionButton.label}
          data-testid={callToActionButton.dataTestId}
          onClick={callToActionButton.callback}
          w={'$fill'}
        />
      )}
      {secondaryButtons.map(({ callback, dataTestId, label }) => (
        <Button.Secondary key={dataTestId} onClick={callback} data-testid={dataTestId} label={label} w={'$fill'} />
      ))}
    </Flex>
  );
};
