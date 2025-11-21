import React, { useState } from 'react';
import styles from './TransitionAcknowledgmentDialog.module.scss';
import { Button } from '@lace/common';
import { Checkbox, Modal, Typography } from 'antd';
import { HW_POPUPS_WIDTH } from '@src/utils/constants';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface TransitionAcknowledgmentDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmationLabel: string;
  storageMemoEntryName: string;
}

export const TransitionAcknowledgmentDialog = ({
  visible,
  onClose,
  title,
  description,
  confirmationLabel,
  storageMemoEntryName
}: TransitionAcknowledgmentDialogProps): React.ReactElement => {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(false);
  const onCheckboxChange = (e: CheckboxChangeEvent) => {
    const newState = e.target.checked;
    setChecked(newState);
    localStorage.setItem(storageMemoEntryName, String(newState));
  };

  return (
    <Modal
      centered
      closable={false}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      open={visible}
      width={HW_POPUPS_WIDTH}
      className={styles.transitionAcknowledgment}
      zIndex={1001}
    >
      <Title level={3} className={styles.title}>
        {title}
      </Title>
      <Text className={styles.description}>{description}</Text>
      <div className={styles.buttons}>
        <Button onClick={onClose} block>
          {confirmationLabel}
        </Button>
        <Checkbox checked={checked} onChange={onCheckboxChange}>
          <span className={styles.checkboxLabel}>
            {t('browserView.onboarding.sendTransitionAcknowledgment.dontShowAgain')}
          </span>
        </Checkbox>
      </div>
    </Modal>
  );
};
