import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flex, Text, Box, Button, ToggleButtonGroup } from '@input-output-hk/lace-ui-toolkit';

import { Wizard } from '../Wizard';

interface Props {
  onDone: () => void;
  onBack: () => void;
  videosURL: {
    lace: string;
    nami: string;
  };
}

const noop = (): void => void 0;

export const Customize = ({ onDone, onBack, videosURL }: Props): JSX.Element => {
  const { t } = useTranslation();

  return (
    <Wizard step="customize">
      <Box h="$fill">
        <Box mb="$32">
          <Text.SubHeading color="primary" weight="$bold">
            {t('core.namiMigration.customize.title')}
          </Text.SubHeading>
        </Box>
        <Box mt="$24" w="$fill">
          <Text.Body.Normal>{t('core.namiMigration.customize.description')}</Text.Body.Normal>
        </Box>
        <Box mt="$20" w="$fill">
          <ToggleButtonGroup.Root variant="small" value="lace" onValueChange={noop}>
            <ToggleButtonGroup.Item value={'lace'}>Lace</ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item disabled value={'nami'}>
              Nami
            </ToggleButtonGroup.Item>
          </ToggleButtonGroup.Root>
        </Box>
        <Flex mt="$24" flexDirection="column" alignItems="center">
          <video autoPlay loop src={videosURL.lace} width="295" height="166" />
          <Box w="$fill" mt="$24">
            <Text.Body.Normal>{t('core.namiMigration.customize.lace')}</Text.Body.Normal>
          </Box>
        </Flex>
      </Box>
      <Flex w="$fill" justifyContent="space-between">
        <Button.Secondary label={t('core.namiMigration.customize.back')} onClick={onBack} />
        <Button.CallToAction label={t('core.namiMigration.customize.done')} onClick={() => onDone()} />
      </Flex>
    </Wizard>
  );
};
