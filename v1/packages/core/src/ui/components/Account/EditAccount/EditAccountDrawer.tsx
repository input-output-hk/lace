import React, { useState } from 'react';
import { Box, Flex, Button, Text, TextBox } from '@input-output-hk/lace-ui-toolkit';
import { Drawer, DrawerNavigation } from '@lace/common';
import { ACCOUNT_NAME_MAX_LENGTH } from './config';

export type Props = {
  isPopup?: boolean;
  onSave: (name: string) => void;
  visible: boolean;
  hide: () => void;
  name: string;
  index: number;
  translations: {
    title: string;
    inputLabel: string;
    save: string;
    cancel: string;
  };
};

export const EditAccountDrawer = ({
  name,
  index,
  visible,
  onSave,
  hide,
  isPopup = false,
  translations
}: Props): React.ReactElement => {
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
              label={translations.save}
            />
          </Box>
          <Button.Secondary
            w="$fill"
            onClick={hide}
            data-testid="edit-account-cancel-btn"
            label={translations.cancel}
          />
        </Flex>
      }
    >
      <div data-testid="edit-account">
        <Box mb="$16">
          <Text.SubHeading weight="$bold">{translations.title}</Text.SubHeading>
        </Box>
        <TextBox
          data-testid="edit-account-name"
          containerStyle={{ width: '100%' }}
          label={translations.inputLabel}
          defaultValue={name}
          maxLength={ACCOUNT_NAME_MAX_LENGTH}
          onChange={(e) => setCurrentName(e.target.value.trim())}
        />
      </div>
    </Drawer>
  );
};
