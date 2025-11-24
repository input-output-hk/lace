import React, { useMemo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WalletAddressList, WalletAddressItemProps } from '@lace/core';
import { Button } from '@lace/common';
import { ContentLayout } from '@src/components/Layout';
import { AddressBookSchema } from '@src/lib/storage';
import { AddressBookEmpty } from '@src/views/browser-view/features/adress-book/components/AddressBookEmpty';
import { withAddressBookContext, useAddressBookContext } from '../context';
import { AddressDetailDrawer, AddressChangeDetailDrawer } from '../components/AddressDetailDrawer';
import { useAddressBookStore } from '../store';
import styles from './AddressBook.modules.scss';
import DeleteIcon from '../../../assets/icons/delete-icon.component.svg';
import PlusIcon from '../../../assets/icons/plus-icon.svg';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { AddressDetailsSteps } from './AddressDetailDrawer/types';
import { useHandleResolver, useOnAddressSave, useUpdateAddressStatus } from '@hooks';
import { isAdaHandleEnabled } from '@src/features/ada-handle/config';
import { Sections, useSections } from '@src/views/browser-view/features/send-transaction';

const scrollableTargetId = 'popupAddressBookContainerId';

export const AddressBook = withAddressBookContext(() => {
  const [isAddressDrawerOpen, setIsAddressDrawerOpen] = useState<boolean>(false);
  const { list: addressList, count: addressCount, utils } = useAddressBookContext();
  const { extendLimit, deleteRecord: deleteAddress } = utils;
  const { setIsEditAddressVisible, isEditAddressVisible, setAddressToEdit, addressToEdit } = useAddressBookStore();
  const { t: translate } = useTranslation();
  const analytics = useAnalyticsContext();
  const handleResolver = useHandleResolver();
  const validatedAddressStatus = useUpdateAddressStatus(addressList as AddressBookSchema[], handleResolver);

  const { onSaveAddressActions } = useOnAddressSave();
  const { setSection } = useSections();

  const addressListTranslations = {
    name: translate('core.walletAddressList.name'),
    address: translate('core.walletAddressList.address')
  };

  const onAddressSave = (address: AddressBookSchema | Omit<AddressBookSchema, 'id'>) =>
    onSaveAddressActions(address, addressToEdit);

  const list: WalletAddressItemProps[] = useMemo(
    () =>
      addressList?.map((item: AddressBookSchema) => ({
        id: item.id,
        address: item.address,
        name: item.name,
        onClick: (address: AddressBookSchema) => {
          analytics.sendEventToPostHog(PostHogAction.AddressBookAddressRecordClick);
          setAddressToEdit(address);
          if (isAdaHandleEnabled && validatedAddressStatus[address.address]?.isValid === false) {
            setIsAddressDrawerOpen(true);
          } else {
            setIsEditAddressVisible(true);
          }
        },
        isSmall: true,
        isAddressWarningVisible:
          (isAdaHandleEnabled && validatedAddressStatus[item.address]?.isValid === false) ?? false
      })) || [],
    [addressList, analytics, setAddressToEdit, setIsEditAddressVisible, validatedAddressStatus]
  );

  const loadMoreData = useCallback(() => {
    extendLimit();
  }, [extendLimit]);

  const handleAddAddressClick = () => {
    setIsEditAddressVisible(true);
    analytics.sendEventToPostHog(PostHogAction.AddressBookAddAddressClick);
  };

  const addressDrawerInitialStep = (addressToEdit as AddressBookSchema)?.id
    ? AddressDetailsSteps.DETAILS
    : AddressDetailsSteps.CREATE;

  const onHandleDeleteContact = (id: number) => {
    deleteAddress(id, {
      text: translate('browserView.addressBook.toast.deleteAddress'),
      icon: DeleteIcon
    });
    setAddressToEdit({} as AddressBookSchema);
  };

  return (
    <>
      <ContentLayout
        title={
          <div className={styles.title}>
            <h1 data-testid="page-title">
              {translate('addressBook.sectionTitle')}{' '}
              <span className={styles.subTitle} data-testid="counter">
                ({addressCount})
              </span>
            </h1>
          </div>
        }
        id={scrollableTargetId}
      >
        <div className={styles.btnContainer}>
          <Button data-testid="add-address-button" color="gradient" block onClick={handleAddAddressClick}>
            <img src={PlusIcon} alt="plus-icon" />
            {translate('addressBook.empty.addNewAddress')}
          </Button>
        </div>

        {addressCount === 0 ? (
          <div className={styles.emptyScreen} data-testid="empty-address-book">
            <AddressBookEmpty />
          </div>
        ) : (
          <div className={styles.listContainer} data-testid="address-book-list">
            <WalletAddressList
              scrollableTargetId={scrollableTargetId}
              className={styles.addressList}
              items={list}
              loadMoreData={loadMoreData}
              locale={{ emptyText: true }}
              total={addressCount}
              withHeader={false}
              popupView
              translations={addressListTranslations}
            />
          </div>
        )}
      </ContentLayout>
      {isAdaHandleEnabled && (
        <AddressChangeDetailDrawer
          visible={isAddressDrawerOpen}
          onCancelClick={() => {
            setAddressToEdit({} as AddressBookSchema);
            setIsAddressDrawerOpen(false);
            setSection({ currentSection: Sections.FORM });
          }}
          expectedAddress={validatedAddressStatus[addressToEdit.address]?.error?.expectedAddress ?? ''}
          actualAddress={validatedAddressStatus[addressToEdit.address]?.error?.actualAddress ?? ''}
          initialValues={addressToEdit}
          popupView
        />
      )}
      <AddressDetailDrawer
        initialStep={addressDrawerInitialStep}
        initialValues={addressToEdit}
        onCancelClick={() => {
          setAddressToEdit({} as AddressBookSchema);
          setIsEditAddressVisible(false);
        }}
        onConfirmClick={async (address: AddressBookSchema | Omit<AddressBookSchema, 'id'>) => {
          await onAddressSave(address);
          setAddressToEdit({} as AddressBookSchema);
        }}
        onDelete={(id) => onHandleDeleteContact(id)}
        visible={isEditAddressVisible}
        popupView
      />
    </>
  );
});
