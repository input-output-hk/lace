import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flex, Box, Button, Message } from '@input-output-hk/lace-ui-toolkit';

import { Wizard } from '../Wizard';

interface Props {
  onClose: () => void;
}

export const AllDone = ({ onClose }: Props): JSX.Element => {
  const { t } = useTranslation();

  return (
    <Wizard hideTimeline>
      <Flex w="$fill" h="$fill" alignItems="center" justifyContent="center" flexDirection="column">
        <Message title={t('core.namiMigration.allDone.title')} description={t('core.namiMigration.allDone.message')} />
        <Box mt="$40">
          <Button.CallToAction label={t('core.namiMigration.allDone.close')} onClick={onClose} />
        </Box>
      </Flex>
    </Wizard>
  );
};
