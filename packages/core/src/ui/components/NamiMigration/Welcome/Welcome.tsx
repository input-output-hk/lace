import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Flex,
  Text,
  Box,
  Button,
  ThemeColorScheme,
  useTheme,
  CloseComponent,
  CheckComponent
} from '@input-output-hk/lace-ui-toolkit';
import NamiImg from './nami.png';
import LaceImg from './lace.png';
import LaceDarkImg from './lace-dark.png';
import ArrowImg from './arrow-right.png';
import { WalletImg } from './WalletImg';
import { Wizard } from '../Wizard';

interface Props {
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
  faqUrl: string;
  colorScheme?: ThemeColorScheme;
  onNext: () => void;
}

export const Welcome = ({ termsOfServiceUrl, privacyPolicyUrl, faqUrl, colorScheme, onNext }: Props): JSX.Element => {
  const { t } = useTranslation();

  const theme = useTheme();
  const isLight = colorScheme ? colorScheme === 'light' : theme.colorScheme === 'light';

  return (
    <Wizard step="welcome">
      <Box h="$fill" w="$fill">
        <Box mb="$32">
          <Text.SubHeading color="primary" weight="$bold">
            {t('core.namiMigration.welcome')}
          </Text.SubHeading>
        </Box>
        <Flex alignItems="center" justifyContent="center">
          <Box w="$96" h="$96">
            <WalletImg img={NamiImg} icon={<CloseComponent />} color="error" />
          </Box>
          <Box mx="$40">
            <img src={ArrowImg} alt="Arrow" />
          </Box>
          <Box w="$96" h="$96">
            <WalletImg img={isLight ? LaceImg : LaceDarkImg} icon={<CheckComponent />} color="success" />
          </Box>
        </Flex>
        <Box mt="$32">
          <Text.Body.Normal>{t('core.namiMigration.description.1')}</Text.Body.Normal>
          <Box mt="$24" />
          <Text.Body.Normal>{t('core.namiMigration.description.2')}</Text.Body.Normal>
          <Box mt="$24" />
          <Text.Body.Normal>
            <Trans
              i18nKey="core.namiMigration.faq"
              components={{
                a1: <a href={faqUrl} target="_blank" data-testid="nami-migration-faq-link" rel="noreferrer" />
              }}
            />
          </Text.Body.Normal>
          <Box mt="$24" />
          <Text.Body.Normal>
            <Trans
              i18nKey="core.namiMigration.tos"
              components={{
                a1: (
                  <a href={termsOfServiceUrl} target="_blank" data-testid="nami-migration-tos-link" rel="noreferrer" />
                ),
                a2: (
                  <a
                    href={privacyPolicyUrl}
                    target="_blank"
                    data-testid="nami-migration-privacy-policy-link"
                    rel="noreferrer"
                  />
                )
              }}
            />
          </Text.Body.Normal>
        </Box>
      </Box>
      <Flex w="$fill" justifyContent="flex-end">
        <Button.CallToAction label={t('core.namiMigration.cta')} onClick={onNext} />
      </Flex>
    </Wizard>
  );
};
