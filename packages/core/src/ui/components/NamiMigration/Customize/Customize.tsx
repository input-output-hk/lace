import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flex, Text, Box, Button, ToggleButtonGroup } from '@input-output-hk/lace-ui-toolkit';

import { Wizard } from '../Wizard';

interface Props {
  onDone: (mode: Mode) => void;
  onBack: () => void;
  videosURL: {
    lace: string;
    nami: string;
  };
  onChange?: (mode: Mode) => void;
}

type Mode = 'lace' | 'nami';

const noop = (): void => void 0;

export const Customize = ({ onDone, onBack, videosURL, onChange = noop }: Props): JSX.Element => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('lace');

  const handleModeChange = (value: Mode) => {
    setMode(value);
    onChange(value);
  };

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
          <ToggleButtonGroup.Root variant="small" value={mode} onValueChange={handleModeChange}>
            <ToggleButtonGroup.Item value={'lace'}>Lace</ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item value={'nami'}>Nami</ToggleButtonGroup.Item>
          </ToggleButtonGroup.Root>
        </Box>
        <Flex mt="$24" flexDirection="column" alignItems="center">
          {mode === 'lace' ? (
            <>
              <video autoPlay loop src={videosURL.lace} width="295" height="166" />
              <Box w="$fill" mt="$24">
                <Text.Body.Normal>{t('core.namiMigration.customize.lace')}</Text.Body.Normal>
              </Box>
            </>
          ) : (
            <>
              <video autoPlay loop src={videosURL.nami} width="297" height="175" />
              <Box w="$fill" mt="$24">
                <Text.Body.Normal>{t('core.namiMigration.customize.nami')}</Text.Body.Normal>
              </Box>
            </>
          )}
        </Flex>
      </Box>
      <Flex w="$fill" justifyContent="space-between">
        <Button.Secondary label={t('core.namiMigration.customize.back')} onClick={onBack} />
        <Button.CallToAction label={t('core.namiMigration.customize.cta')} onClick={() => onDone(mode)} />
      </Flex>
    </Wizard>
  );
};
