/* eslint-disable react/prop-types */
import { Button, ButtonProps } from '@lace/common';
import { Modal } from 'antd';
import cn from 'classnames';
import React from 'react';
import { useStakePoolDetails } from '../store';
import styles from './StakingModal.module.scss';

type actionProps = {
  dataTestId: string;
  body?: React.ReactNode;
  color?: ButtonProps['color'];
  onClick: () => void;
};

export type StakingModalProps = {
  title: React.ReactNode;
  visible: boolean;
  description: React.ReactNode;
  actions: actionProps[];
  popupView?: boolean;
};

const popupModalWidth = 312;
const extendedModalWidth = 479;

export const StakingModal = ({
  title,
  description,
  visible,
  actions,
  popupView,
}: StakingModalProps): React.ReactElement<StakingModalProps> => {
  const { setStakeConfirmationVisible, setExitStakingVisible, setNoFundsVisible } = useStakePoolDetails();

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
    >
      <div data-testid="stake-modal-title" className={styles.header}>
        {title}
      </div>
      <div data-testid="stake-modal-description" className={styles.content}>
        {description}
      </div>
      <div data-testid="stake-modal-actions" className={styles.footer}>
        {actions.map(
          ({ dataTestId, body, ...action }: actionProps): React.ReactElement => (
            <Button key={dataTestId} data-testid={dataTestId} {...action} block>
              {body}
            </Button>
          )
        )}
      </div>
    </Modal>
  );
};
