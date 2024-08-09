/* eslint-disable react/no-multi-comp */
import React, { VFC } from 'react';
import {
  Box,
  Card,
  Flex,
  KeyFilledComponent as KeyIcon,
  MnemonicComponent as MnemonicWordsIcon,
  PaperwalletComponent as PaperWalletIcon,
  RadioButtonGroup,
  Text
} from '@input-output-hk/lace-ui-toolkit';
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps } from '@lace/core';
import { i18n } from '@lace/translation';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import cn from 'classnames';
import { Trans } from 'react-i18next';
import { RecoveryMethod } from '../../types';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { useCreateWallet } from '../context';
import styles from './ChooseRecoveryMethod.module.scss';

const FAQ_URL = `${process.env.FAQ_URL}?question=what-is-paper-wallet`;

export const ChooseRecoveryMethod: VFC = () => {
  const { postHogActions } = useWalletOnboarding();
  const { back, next, recoveryMethod, setRecoveryMethod } = useCreateWallet();
  const analytics = useAnalyticsContext();

  const handleNext = () => {
    void analytics.sendEventToPostHog(postHogActions.create.CHOOSE_RECOVERY_MODE_NEXT_CLICK);
    next();
  };

  return (
    <>
      <WalletSetupStepLayoutRevamp
        title={i18n.t('paperWallet.chooseRecoveryMethod.title')}
        description={
          <Trans
            i18nKey="paperWallet.chooseRestoreMethod.description"
            components={{
              a: <a href={FAQ_URL} target="_blank" rel="noopener noreferrer" data-testid="faq-what-is-paper-wallet" />
            }}
          />
        }
        onBack={back}
        onNext={handleNext}
        currentTimelineStep={WalletTimelineSteps.CHOOSE_RECOVERY_METHOD}
      >
        <Flex flexDirection="column" w="$fill" h="$fill">
          <RadioButtonGroup
            selectedValue={recoveryMethod}
            onValueChange={(value: RecoveryMethod) => setRecoveryMethod(value)}
            className={styles.noPadding}
            options={[
              {
                value: 'mnemonic',
                label: i18n.t('core.walletSetupStep.recoveryPhrase'),
                render: ({ optionElement, onOptionClick }) => (
                  <Card.Outlined
                    onClick={() => {
                      void analytics.sendEventToPostHog(postHogActions.create.CHOOSE_RECOVERY_MODE_MNEMONIC_CLICK);
                      onOptionClick();
                    }}
                    className={cn({
                      [styles.selectedRestoreMethod]: recoveryMethod === 'mnemonic',
                      [styles.optionCard]: recoveryMethod !== 'mnemonic'
                    })}
                  >
                    <Flex p="$16" gap="$24" justifyContent="space-between" className={styles.pointer}>
                      <Flex flexDirection="column">
                        <Flex mb="$8">{optionElement}</Flex>
                        <Box pl="$40">
                          <Text.Body.Normal weight="$medium" color="secondary" data-testid="mnemonic-words-description">
                            {i18n.t('paperWallet.chooseRecoveryMethod.mnemonicDescription')}
                          </Text.Body.Normal>
                        </Box>
                      </Flex>
                      <Flex>
                        <MnemonicWordsIcon className={styles.restoreIcon} data-testid="mnemonic-words-icon" />
                      </Flex>
                    </Flex>
                  </Card.Outlined>
                )
              },
              {
                value: 'paper',
                label: i18n.t('paperWallet.chooseRestoreMethod.option.paper'),
                render: ({ optionElement, onOptionClick }) => (
                  <Card.Outlined
                    onClick={() => {
                      void analytics.sendEventToPostHog(postHogActions.create.CHOOSE_RECOVERY_MODE_PAPER_CLICK);
                      onOptionClick();
                    }}
                    className={cn(styles.paperWalletRadioGroupItem, {
                      [styles.selectedRestoreMethod]: recoveryMethod === 'paper',
                      [styles.optionCard]: recoveryMethod !== 'paper'
                    })}
                  >
                    <Flex p="$16" gap="$24" justifyContent="space-between" className={styles.pointer}>
                      <Flex flexDirection="column">
                        <Flex mb="$8" gap="$8" alignItems="center">
                          <Flex>{optionElement}</Flex>
                          <Text.Body.Small className={styles.advancedBadge} data-testid="paper-wallet-advanced-badge">
                            {i18n.t('paperWallet.chooseRecoveryMethod.advanced')}
                          </Text.Body.Small>
                        </Flex>
                        <Box pl="$40">
                          <Text.Body.Normal weight="$medium" color="secondary" data-testid="paper-wallet-description">
                            {i18n.t('paperWallet.chooseRecoveryMethod.paperWallet.description')}
                          </Text.Body.Normal>
                        </Box>
                        <Flex ml="$40" gap="$8" mt="$8">
                          <KeyIcon width={20} height={20} data-testid="paper-wallet-pgp-keys-icon" />
                          <Text.Label
                            weight="$medium"
                            className={styles.pgpInfoLabel}
                            data-testid="paper-wallet-pgp-keys-label"
                          >
                            {i18n.t('paperWallet.chooseRecoveryMethod.pgpKeysRequired')}
                          </Text.Label>
                        </Flex>
                      </Flex>
                      <Flex>
                        <PaperWalletIcon className={styles.restoreIcon} data-testid="paper-wallet-icon" />
                      </Flex>
                    </Flex>
                  </Card.Outlined>
                )
              }
            ]}
          />
        </Flex>
      </WalletSetupStepLayoutRevamp>
    </>
  );
};
