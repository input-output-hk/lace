import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, Button, Text, Input } from '@lace/ui';
import { Drawer, DrawerNavigation } from '@lace/common';

export type Props = {
  onSave: (name: string) => void;
  visible: boolean;
  hide: () => void;
  name: string;
  index: string;
};

export const EditAccountDrawer = ({ name, index, visible, onSave, hide }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const [currentName, setName] = useState(name);

  return (
    <Drawer
      zIndex={999}
      visible={visible}
      navigation={<DrawerNavigation title={name || `Account #${index}`} onCloseIconClick={hide} />}
      footer={
        <Flex flexDirection="column">
          <Box mb="$16" w="$fill">
            <Button.CallToAction
              w="$fill"
              disabled={name === currentName}
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
        <Input
          containerStyle={{ width: '100%' }}
          label={t('account.edit.input.label')}
          value={currentName}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </Drawer>
  );
};
