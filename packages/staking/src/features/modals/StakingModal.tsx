/* eslint-disable react/prop-types */
import { Button, ButtonProps } from '@lace/common';
import { Modal } from 'antd';
import cn from 'classnames';
import React from 'react';
import { useStakingStore } from '../store';
import styles from './StakingModal.module.scss';

type StakingModalActionProps = {
  dataTestId: string;
  body?: React.ReactNode;
  color?: ButtonProps['color'];
  disabled?: boolean;
  onClick: () => void;
};

export type StakingModalProps = {
  title: React.ReactNode;
  visible: boolean;
  announcement?: boolean;
  description: React.ReactNode;
  actions: StakingModalActionProps[];
  popupView?: boolean;
  focusTriggerAfterClose?: boolean;
};

const popupModalWidth = 312;
const extendedModalWidth = 512;

export const StakingModal = ({
  announcement,
  title,
  description,
  visible,
  actions,
  popupView,
  focusTriggerAfterClose,
}: StakingModalProps): React.ReactElement<StakingModalProps> => {
  const { setStakeConfirmationVisible, setExitStakingVisible, setNoFundsVisible } = useStakingStore();

  const handleCancelModal = () => {
    setStakeConfirmationVisible(false);
    setExitStakingVisible(false);
    setNoFundsVisible(false);
  };

  return (
    <Modal
      destroyOnClose
      centered
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      className={cn(styles.modal, { [styles.popupView!]: popupView })}
      onCancel={handleCancelModal}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      visible={visible}
      width={popupView ? popupModalWidth : extendedModalWidth}
      focusTriggerAfterClose={focusTriggerAfterClose ?? true}
    >
      <div
        data-testid="stake-modal-title"
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        className={cn(styles.header, { [styles.headerAnnouncement!]: announcement })}
      >
        {title}
      </div>
      <div
        data-testid="stake-modal-description"
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        className={cn(styles.content, { [styles.contentAnnouncement!]: announcement })}
      >
        {description}
      </div>
      <div data-testid="stake-modal-actions" className={styles.footer}>
        {actions.map(
          ({ dataTestId, body, ...action }: StakingModalActionProps): React.ReactElement => (
            <Button key={dataTestId} data-testid={dataTestId} {...action} block>
              {body}
            </Button>
          )
        )}
      </div>
    </Modal>
  );
};
