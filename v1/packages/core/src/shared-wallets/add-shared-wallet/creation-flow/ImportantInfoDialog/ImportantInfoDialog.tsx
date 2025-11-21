import { Box, Checkbox, Dialog, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ImportantInfoDialog.module.scss';

type Props = {
  onBack: () => void;
  onNext: () => void;
  open: boolean;
  zIndex?: number;
};

export const ImportantInfoDialog = ({ onBack, onNext, open, zIndex }: Props): JSX.Element => {
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation();

  return (
    <Dialog.Root open={open} setOpen={() => void 0} zIndex={zIndex}>
      <Dialog.Title>
        <Text.SubHeading weight="$bold">{t('sharedWallets.addSharedWallet.importantInfo.title')}</Text.SubHeading>
      </Dialog.Title>
      <Dialog.Description>
        <>
          <Text.Body.Normal weight="$medium" data-testid="dialog-subtitle">
            {t('sharedWallets.addSharedWallet.importantInfo.subtitle')}
          </Text.Body.Normal>
          <Flex>
            <Box mt="$4">
              <Checkbox checked={checked} onClick={() => setChecked(!checked)} data-testid="dialog-checkbox" />
            </Box>
            <Box ml="$10" onClick={() => setChecked(!checked)} className={styles.checkBoxLabel}>
              <Text.Body.Small weight="$semibold" data-testid="dialog-checkbox-label">
                {t('sharedWallets.addSharedWallet.importantInfo.checkBoxLabel')}
              </Text.Body.Small>
            </Box>
          </Flex>
        </>
      </Dialog.Description>
      <Dialog.Actions>
        <Dialog.Action
          cancel
          label={t('sharedWallets.addSharedWallet.importantInfo.button.back')}
          onClick={onBack}
          testId="dialog-back-button"
        />
        <Dialog.Action
          disabled={!checked}
          label={t('sharedWallets.addSharedWallet.importantInfo.button.next')}
          onClick={onNext}
          testId="dialog-next-button"
        />
      </Dialog.Actions>
    </Dialog.Root>
  );
};
