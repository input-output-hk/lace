import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Flex, Text, Box, Button } from '@lace/ui';
import { ReactComponent as CloseComponent } from '@lace/icons/dist/CloseComponent';
import { ReactComponent as CheckComponent } from '@lace/icons/dist/CheckComponent';
import NamiImg from './nami.png';
import LaceImg from './lace.png';
import ArrowImg from './arrow-right.png';
import { WalletImg } from './WalletImg';
import { Wizard } from '../Wizard';

interface Props {
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
  faqUrl: string;
}

export const Welcome = ({ termsOfServiceUrl, privacyPolicyUrl, faqUrl }: Props): JSX.Element => {
  const { t } = useTranslation();

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
            <WalletImg img={LaceImg} icon={<CheckComponent />} color="success" />
          </Box>
        </Flex>
        <Box mt="$32">
          <Text.Body.Normal>{t('core.namiMigration.description')}</Text.Body.Normal>
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
          <Text.Body.Small weight="$medium">
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
          </Text.Body.Small>
        </Box>
      </Box>
      <Flex w="$fill" justifyContent="flex-end" mt="$64">
        <Button.CallToAction label={t('core.namiMigration.cta')} />
      </Flex>
    </Wizard>
  );
};
