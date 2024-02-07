import React from 'react';
import styles from './ContinueInBrowserDialog.module.scss';
import { Button } from '@lace/common';
import { Modal, Typography } from 'antd';
import { HW_POPUPS_WIDTH } from '@src/utils/constants';

const { Title, Text } = Typography;

interface ContinueInBrowserDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
  title: string;
  description: string;
  okLabel: string;
  cancelLabel: string;
}

export const ContinueInBrowserDialog = ({
  visible,
  onConfirm,
  onClose,
  title,
  description,
  okLabel,
  cancelLabel
}: ContinueInBrowserDialogProps): React.ReactElement => (
  <Modal
    centered
    closable={false}
    // eslint-disable-next-line unicorn/no-null
    footer={null}
    open={visible}
    width={HW_POPUPS_WIDTH}
    className={styles.continueInBrowser}
  >
    <Title level={3} className={styles.title}>
      {title}
    </Title>
    <Text className={styles.description}>{description}</Text>
    <div className={styles.buttons}>
      <Button onClick={onConfirm} block>
        {okLabel}
      </Button>
      <Button onClick={onClose} color="secondary" block>
        {cancelLabel}
      </Button>
    </div>
  </Modal>
);
