/* eslint-disable react/no-multi-comp */
import React, { VFC } from 'react';
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps } from '@lace/core';
import cn from 'classnames';
import { useRestoreWallet } from '../context';
import {
  Box,
  Card,
  Flex,
  RadioButtonGroup,
  Text,
  PaperwalletComponent as PaperWalletIcon,
  MnemonicComponent as MnemonicWordsIcon
} from '@input-output-hk/lace-ui-toolkit';
import styles from './ChooseRestoreMethod.module.scss';
import { i18n } from '@lace/translation';

import { RecoveryMethod } from '../../types';
import { Trans } from 'react-i18next';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { useAnalyticsContext } from '@providers';

const FAQ_URL = `${process.env.FAQ_URL}?question=what-is-paper-wallet`;

export const ChooseRestoreMethod: VFC = () => {
  const { postHogActions } = useWalletOnboarding();
  const { back, next, recoveryMethod, setRecoveryMethod } = useRestoreWallet();
  const analytics = useAnalyticsContext();

  const handleNext = () => {
    void analytics.sendEventToPostHog(postHogActions.restore.CHOOSE_RECOVERY_MODE_NEXT_CLICK);
    next();
  };

  return (
    <>
      <WalletSetupStepLayoutRevamp
        title={i18n.t('paperWallet.chooseRestoreMethod.title')}
        description={
          <Trans
            i18nKey="paperWallet.chooseRestoreMethod.description"
            components={{
              a: (
                <a
                  href={FAQ_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="faq-what-is-paper-wallet-url"
                />
              )
            }}
          />
        }
        onBack={back}
        onNext={handleNext}
        currentTimelineStep={WalletTimelineSteps.CHOOSE_RECOVERY_METHOD}
        paperWalletEnabled
      >
        <Flex flexDirection={'column'} w={'$fill'} h={'$fill'}>
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
                    onClick={onOptionClick}
                    className={cn({
                      [styles.selectedRestoreMethod]: recoveryMethod === 'mnemonic',
                      [styles.optionCard]: recoveryMethod !== 'mnemonic'
                    })}
                  >
                    <Flex p={'$16'} gap={'$24'} justifyContent={'space-between'} style={{ cursor: 'pointer' }}>
                      <Flex flexDirection={'column'}>
                        <Flex mb={'$8'}>{optionElement}</Flex>
                        <Box pl={'$40'}>
                          <Text.Body.Normal weight="$medium" color="secondary" data-testid="mnemonic-words-description">
                            {i18n.t('paperWallet.chooseRecoveryMethod.mnemonicDescription')}
                          </Text.Body.Normal>
                        </Box>
                      </Flex>
                      <Flex>
                        <MnemonicWordsIcon style={{ width: 100, height: 'auto' }} data-testid="mnemonic-words-icon" />
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
                    onClick={onOptionClick}
                    className={cn(styles.paperWalletRadioGroupItem, {
                      [styles.selectedRestoreMethod]: recoveryMethod === 'paper',
                      [styles.optionCard]: recoveryMethod !== 'paper'
                    })}
                  >
                    <Flex p={'$16'} gap={'$24'} justifyContent={'space-between'} style={{ cursor: 'pointer' }}>
                      <Flex flexDirection={'column'}>
                        <Flex mb={'$8'} gap={'$8'} alignItems={'center'}>
                          {optionElement}
                        </Flex>
                        <Box pl={'$40'}>
                          <Text.Body.Normal weight="$medium" color="secondary" data-testid="mpaper-wallet-description">
                            {i18n.t('paperWallet.chooseRecoveryMethod.paperWallet.description')}
                          </Text.Body.Normal>
                        </Box>
                      </Flex>
                      <Flex>
                        <PaperWalletIcon style={{ width: 100, height: 'auto' }} data-testid="mpaper-wallet-icon" />
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
