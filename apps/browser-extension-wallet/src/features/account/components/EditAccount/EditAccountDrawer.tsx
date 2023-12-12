import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, Button, Text, TextBox } from '@lace/ui';
import { Drawer, DrawerNavigation } from '@lace/common';
import { ACCOUNT_NAME_MAX_LENGTH } from '../../config';

export type Props = {
  isPopup?: boolean;
  onSave: (name: string) => void;
  visible: boolean;
  hide: () => void;
  name: string;
  index: number;
};

export const EditAccountDrawer = ({
  name,
  index,
  visible,
  onSave,
  hide,
  isPopup = false
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const [currentName, setCurrentName] = useState(name);

  return (
    <Drawer
      zIndex={1100}
      open={visible}
      navigation={<DrawerNavigation title={name || `Account #${index}`} onCloseIconClick={hide} />}
      onClose={hide}
      popupView={isPopup}
      footer={
        <Flex flexDirection="column">
          <Box mb="$16" w="$fill">
            <Button.CallToAction
              w="$fill"
              disabled={name === currentName || currentName === '' || currentName === undefined}
              onClick={() => onSave(currentName)}
              data-testid="edit-account-save-btn"
              label={t('account.edit.footer.save')}
            />
          </Box>
          <Button.Secondary
            w="$fill"
            onClick={hide}
            data-testid="edit-account-cancel-btn"
            label={t('account.edit.footer.cancel')}
          />
        </Flex>
      }
    >
      <div data-testid="edit-account">
        <Box mb="$16">
          <Text.SubHeading weight="$bold">{t('account.edit.title')}</Text.SubHeading>
        </Box>
        <Box mb="$64">
          <Text.Body.Normal>{t('account.edit.subtitle')}</Text.Body.Normal>
        </Box>
        <TextBox
          data-testid="edit-account-name-input"
          containerStyle={{ width: '100%' }}
          label={t('account.edit.input.label')}
          defaultValue={name}
          maxLength={ACCOUNT_NAME_MAX_LENGTH}
          onChange={(e) => setCurrentName(e.target.value.trim())}
        />
      </div>
    </Drawer>
  );
};
