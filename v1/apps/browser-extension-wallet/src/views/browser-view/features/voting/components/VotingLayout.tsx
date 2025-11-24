/* eslint-disable react/no-multi-comp */
import { CurrentCatalystFund, VotingParticipation } from '@lace/cardano';
import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { CatalystRegistrationFlow, WalletRegistrationStep, walletRegistrationSteps } from './CatalystRegistrationFlow';
import styles from './VotingLayout.module.scss';
import { PageTitle } from '@components/Layout';
import {
  EducationalList,
  FundWalletBanner,
  Layout,
  SectionLayout,
  WarningModal
} from '@src/views/browser-view/components';
import { useWalletStore } from '@src/stores';
import { ActionableAlert, Button, MultiStepProgressLine, DrawerHeader, DrawerNavigation, Drawer } from '@lace/common';
import classnames from 'classnames';
import type { TranslationKey } from '@lace/translation';

const votingPhases = ['registration', 'snapshot', 'voting'] as const;
type VotingPhase = typeof votingPhases[number];

const votingPhaseName: Record<VotingPhase, TranslationKey> = {
  registration: 'browserView.voting.registration',
  snapshot: 'browserView.voting.snapshot',
  voting: 'browserView.voting.voting'
};

// FIXME: all the data below is mocked. Replace with the real one once the SDK is ready
const MOCK_FUND_NUMBER = 8;
const VOTING_MIN_ADA_AMOUNT = 500;

export const VotingLayout = (): React.ReactElement => {
  const {
    walletInfo,
    walletUI: { cardanoCoin }
  } = useWalletStore();

  const [isRegisteringWallet, setIsRegisteringWallet] = useState(false);
  const { t: translate } = useTranslation();

  const [currentPhase] = useState<VotingPhase>('voting');
  const [currentStep, setCurrentStep] = useState<WalletRegistrationStep>(walletRegistrationSteps[0]);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const handleCloseRegistrationRequest = () => {
    if (currentStep === walletRegistrationSteps[0]) {
      setIsRegisteringWallet(false);
    } else {
      setIsCancelModalOpen(true);
    }
  };

  const currentCatalystFundTranslations = {
    endOfRegistration: translate('cardano.currentCatalystFund.endOfRegistration')
  };

  const votingParticipationTranslations = {
    walletStatus: translate('cardano.votingParticipation.walletStatus')
  };

  // TODO: replace mock with the real content once ready + use translation
  const educationalItems = [
    {
      title: 'Why?',
      subtitle: 'How does voting improve network governance?',
      link: '/'
    },
    {
      title: 'Impact',
      subtitle: 'Why does my vote matter?',
      link: '/'
    },
    {
      title: 'Challenges',
      subtitle: 'What are the proposals we are voting on?',
      link: '/'
    }
  ];

  const hasEnoughBalance = true;
  const isRegistered = false;
  const startWalletRegistration = () => setIsRegisteringWallet(true);

  const phaseRenderFunctions: Record<VotingPhase, () => JSX.Element> = {
    registration: () => (
      <>
        <p>{translate('browserView.voting.registerYourWallet')}</p>
        {isRegistered ? (
          <div className={styles.badge}>{translate('browserView.voting.registered')}</div>
        ) : (
          <Button disabled={!hasEnoughBalance} onClick={startWalletRegistration}>
            {translate('browserView.voting.register')}
          </Button>
        )}
      </>
    ),
    snapshot: () => (
      <p>
        <Trans
          components={{
            b: <b />
          }}
          values={{ amount: VOTING_MIN_ADA_AMOUNT }}
          i18nKey="browserView.voting.snapshotExplanation"
        />
      </p>
    ),
    voting: () => (
      <>
        <p>
          <Trans
            components={{
              b: <b />
            }}
            i18nKey="browserView.voting.voteForChallenges"
          />
        </p>
        <div className={classnames([styles.badge, hasEnoughBalance ? styles.promptBadge : styles.neutralBadge])}>
          {hasEnoughBalance
            ? translate('browserView.voting.votePrompt')
            : translate('browserView.voting.canNotParticipate')}
        </div>
      </>
    )
  };

  return (
    <Layout>
      <SectionLayout
        sidePanelContent={
          <EducationalList items={educationalItems} title={translate('browserView.voting.educationalList.title')} />
        }
      >
        <div className={styles.mainColumn}>
          <PageTitle>{translate('browserView.voting.pageTitle')}</PageTitle>
          <div className={styles.content}>
            <VotingParticipation
              status={isRegistered ? 'registered' : 'unregistered'}
              assetAmount="0"
              translations={votingParticipationTranslations}
              assetTicker={cardanoCoin.symbol}
            />
            <FundWalletBanner
              title={translate('browserView.voting.fundWalletBanner.title')}
              subtitle={translate('browserView.voting.fundWalletBanner.subtitle')}
              prompt={translate('browserView.fundWalletBanner.prompt')}
              walletAddress={walletInfo.addresses[0].address.toString()}
            />
            <ActionableAlert
              message={translate('browserView.voting.alert.registrationEnded.message')}
              actionText={translate('browserView.voting.alert.registrationEnded.action')}
              onClick={startWalletRegistration}
            />
            <h5 className={styles.sectionTitle}>{translate('browserView.voting.votingPhase')}</h5>
            <CurrentCatalystFund
              fundNumber={MOCK_FUND_NUMBER}
              fundName="Innovation"
              registrationEndsAt="20d 10hs 32m"
              translations={currentCatalystFundTranslations}
            />
            <MultiStepProgressLine steps={[{ progress: 1 }, { progress: 0.3, point: 0.6 }, { progress: 0 }]} />
            <div className={styles.steps}>
              {votingPhases.map((phase, index) => {
                const isCurrentPhase = phase === currentPhase;

                return (
                  <div
                    key={phase}
                    className={isCurrentPhase ? classnames([styles.card, styles.expandedCard]) : styles.card}
                  >
                    <div className={styles.title}>
                      <p>
                        {translate('browserView.voting.phase')} {index + 1}
                      </p>
                      <h5>{translate(votingPhaseName[phase])}</h5>
                    </div>
                    {isCurrentPhase && <div className={styles.content}>{phaseRenderFunctions[phase]()}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <WarningModal
          header={translate('general.warnings.youHaveToStartAgain')}
          content={
            <div className={styles.cancelModalContent}>
              {translate('general.warnings.areYouSureYouWantToExit')}
              <br />
              {translate('general.warnings.thisWillNotBeSaved')}
            </div>
          }
          onConfirm={() => {
            setIsCancelModalOpen(false);
            setIsRegisteringWallet(false);
            setCurrentStep(walletRegistrationSteps[0]);
          }}
          onCancel={() => setIsCancelModalOpen(false)}
          visible={isCancelModalOpen}
        />
        <Drawer
          onClose={handleCloseRegistrationRequest}
          visible={isRegisteringWallet}
          title={<DrawerHeader title={translate('browserView.voting.catalystRegistrationFlow.title')} />}
          navigation={<DrawerNavigation onCloseIconClick={handleCloseRegistrationRequest} />}
        >
          {isRegisteringWallet && (
            <CatalystRegistrationFlow
              currentStep={currentStep}
              onCurrentStepChange={setCurrentStep}
              onCloseRequest={handleCloseRegistrationRequest}
            />
          )}
        </Drawer>
      </SectionLayout>
    </Layout>
  );
};
