/* eslint-disable no-empty-pattern */
import React from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Drawer, DrawerNavigation, DrawerHeader } from '@lace/common';
import styles from './AddressChangeDetailDrawer.module.scss';
import { AddressChangeDetail } from '../AddressChangeDetail';
import { Footer } from '@src/views/browser-view/features/send-transaction/components/SendTransactionDrawer';
import { Sections, useSections } from '@src/views/browser-view/features/send-transaction';

type InitialValuesProps = {
  address?: string;
  id?: number;
  name?: string;
};

type AddressChangeDetailDrawerProps = {
  initialValues: InitialValuesProps;
  visible: boolean;
  expectedAddress: string;
  actualAddress: string;
  popupView?: boolean;
  onCancelClick?: (event?: React.MouseEvent<HTMLButtonElement>) => unknown;
};

export const AddressChangeDetailDrawer = ({
  initialValues,
  onCancelClick,
  visible,
  popupView,
  expectedAddress,
  actualAddress
}: AddressChangeDetailDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const { setSection } = useSections();

  return (
    <>
      <Drawer
        zIndex={999}
        onClose={onCancelClick}
        className={cn(styles.drawer, { [styles.popupView]: popupView })}
        title={<DrawerHeader title={t('addressBook.reviewModal.title', { name: initialValues.name })} />}
        open={visible}
        navigation={
          <DrawerNavigation
            onCloseIconClick={!popupView ? onCancelClick : undefined}
            onArrowIconClick={popupView ? onCancelClick : undefined}
          />
        }
        afterOpenChange={(open) => setSection({ currentSection: open ? Sections.ADDRESS_CHANGE : Sections.FORM })}
        footer={<Footer isPopupView={popupView} onHandleChangeConfirm={() => onCancelClick()} />}
        popupView={popupView}
      >
        <AddressChangeDetail
          isPopupView={popupView}
          name={initialValues.name}
          expectedAddress={expectedAddress}
          actualAddress={actualAddress}
        />
      </Drawer>
    </>
  );
};
