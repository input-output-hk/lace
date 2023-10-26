import { useTranslation } from 'react-i18next';
import { StakingModal } from './StakingModal';

export enum PoolsManagementModalType {
  ADJUSTMENT = 'adjustment',
  REDUCTION = 'reduction',
}

interface PoolsManagementModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  type: PoolsManagementModalType | null;
}

export const PoolsManagementModal = ({ visible, onConfirm, onCancel, type }: PoolsManagementModalProps) => {
  const { t } = useTranslation();

  return (
    <StakingModal
      title={t('modals.poolsManagement.title')}
      visible={visible}
      description={
        type === PoolsManagementModalType.ADJUSTMENT
          ? t('modals.poolsManagement.description.adjustment')
          : t('modals.poolsManagement.description.reduction')
      }
      actions={[
        {
          body: t('modals.poolsManagement.buttons.cancel'),
          color: 'secondary',
          dataTestId: 'switch-pools-modal-cancel',
          onClick: () => onCancel(),
        },
        {
          body: t('modals.poolsManagement.buttons.confirm'),
          dataTestId: 'switch-pools-modal-confirm',
          onClick: () => onConfirm(),
        },
      ]}
      focusTriggerAfterClose={false}
    />
  );
};
