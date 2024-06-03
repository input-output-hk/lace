import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flex, Text, Box, Button, ToggleButtonGroup } from '@lace/ui';
import nami from './nami.mp4';
import lace from './lace.mp4';

import { Wizard } from '../Wizard';

interface Props {
  onDone: () => void;
  onBack: () => void;
}

type Mode = 'lace' | 'nami';

export const Customize = ({ onDone, onBack }: Props): JSX.Element => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('lace');

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
          <ToggleButtonGroup.Root variant="small" value={mode} onValueChange={(value) => setMode(value as Mode)}>
            <ToggleButtonGroup.Item value={'lace'}>Lace</ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item value={'nami'}>Nami</ToggleButtonGroup.Item>
          </ToggleButtonGroup.Root>
        </Box>
        <Flex mt="$24" flexDirection="column" alignItems="center">
          {mode === 'lace' ? (
            <>
              <video autoPlay loop src={lace} width="295" height="166" />
              <Box w="$fill" mt="$24">
                <Text.Body.Normal>{t('core.namiMigration.customize.lace')}</Text.Body.Normal>
              </Box>
            </>
          ) : (
            <>
              <video autoPlay loop src={nami} width="297" height="175" />
              <Box w="$fill" mt="$24">
                <Text.Body.Normal>{t('core.namiMigration.customize.nami')}</Text.Body.Normal>
              </Box>
            </>
          )}
        </Flex>
      </Box>
      <Flex w="$fill" justifyContent="space-between">
        <Button.Secondary label={t('core.namiMigration.customize.back')} onClick={onBack} />
        <Button.CallToAction label={t('core.namiMigration.customize.cta')} onClick={onDone} />
      </Flex>
    </Wizard>
  );
};
