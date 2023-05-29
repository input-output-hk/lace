import React, { useMemo, useState, useCallback } from 'react';
import isNumber from 'lodash/isNumber';
import { useTranslation } from 'react-i18next';
import { WalletAddressList, WalletAddressItemProps } from '@lace/core';
import { Button } from '@lace/common';
import { withAddressBookContext, useAddressBookContext } from '@src/features/address-book/context';
import { AddressBookSchema } from '@src/lib/storage';
import { useAddressBookStore } from '@src/features/address-book/store';
import { SectionLayout, EducationalList, Layout } from '@src/views/browser-view/components';
import { AddressDetailDrawer } from '@src/features/address-book/components/AddressDetailDrawer';
import { AddressBookEmpty } from '../AddressBookEmpty';
import styles from './AddressBook.module.scss';
import DeleteIcon from '@assets/icons/delete-icon.component.svg';
import AddIcon from '@assets/icons/add.component.svg';
import EditIcon from '@assets/icons/edit.component.svg';
import PlusIcon from '@assets/icons/plus.component.svg';
import Book from '@assets/icons/book.svg';
import { PageTitle } from '@components/Layout';
import { LACE_APP_ID } from '@src/utils/constants';
import { useAnalyticsContext } from '@providers';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';

export const AddressBook = withAddressBookContext((): React.ReactElement => {
  const { t: translate } = useTranslation();
  const { addressToEdit, setAddressToEdit } = useAddressBookStore();
  const { list: addressList, count: addressCount, utils } = useAddressBookContext();
  const { extendLimit, saveRecord: saveAddress, updateRecord: updateAddress, deleteRecord: deleteAddress } = utils;
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [isNewAddressForm, setIsNewAddressForm] = useState(false);
  const analytics = useAnalyticsContext();

  const addressListTranslations = {
    name: translate('core.walletAddressList.name'),
    address: translate('core.walletAddressList.address')
  };

  const titles = {
    glossary: translate('educationalBanners.title.glossary')
  };

  const educationalList = [
    {
      title: titles.glossary,
      subtitle: translate('educationalBanners.subtitle.whatIsLaceAddressBook'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=address-book`
    },
    {
      title: titles.glossary,
      subtitle: translate('educationalBanners.subtitle.whatIsSavedAddress'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=saved-address`
    }
  ];

  const list: WalletAddressItemProps[] = useMemo(
    () =>
      addressList?.map((item: AddressBookSchema) => ({
        id: item.id,
        address: item.address,
        name: item.name,
        onClick: (address: AddressBookSchema) => {
          analytics.sendEvent({
            category: AnalyticsEventCategories.ADDRESS_BOOK,
            action: AnalyticsEventActions.CLICK_EVENT,
            name: AnalyticsEventNames.AddressBook.VIEW_ADDRESS_DETAILS_BROWSER
          });
          setAddressToEdit(address);
          setIsFormVisible(true);
        }
      })) || [],
    [addressList, analytics, setAddressToEdit]
  );

  const loadMoreData = useCallback(() => {
    extendLimit();
  }, [extendLimit]);

  const onAddressSave = (address: AddressBookSchema): Promise<string> => {
    analytics.sendEvent({
      category: AnalyticsEventCategories.ADDRESS_BOOK,
      action: AnalyticsEventActions.CLICK_EVENT,
      name: AnalyticsEventNames.AddressBook.ADD_ADDRESS_BROWSER
    });
    return 'id' in addressToEdit
      ? updateAddress(addressToEdit.id, address, {
          text: translate('browserView.addressBook.toast.editAddress'),
          icon: EditIcon
        })
      : saveAddress(address, {
          text: translate('browserView.addressBook.toast.addAddress'),
          icon: AddIcon
        });
  };

  const handleAddAddressClick = () => {
    setIsNewAddressForm(true);
    setIsFormVisible(true);
  };

  if (!isNumber(addressCount)) return <span />;

  const sidePanel = (
    <EducationalList items={educationalList} title={translate('browserView.sidePanel.aboutYourWallet')} />
  );

  return (
    <Layout>
      <SectionLayout sidePanelContent={sidePanel}>
        <div className={styles.titleContainer}>
          <PageTitle amount={addressCount} data-testid="address-book-page-title">
            {translate('browserView.addressBook.title')}
          </PageTitle>
          <Button onClick={handleAddAddressClick} className={styles.addAddressBtn}>
            <PlusIcon className={styles.btnIcon} />
            {translate('browserView.addressBook.addressList.addItem.button')}
          </Button>
        </div>

        {addressCount ? (
          <>
            <div className={styles.listContainer}>
              <WalletAddressList
                scrollableTargetId={LACE_APP_ID}
                items={list}
                loadMoreData={loadMoreData}
                locale={{ emptyText: true }}
                total={addressCount}
                translations={addressListTranslations}
              />
            </div>
          </>
        ) : (
          <AddressBookEmpty />
        )}
        <AddressDetailDrawer
          initialValues={!isNewAddressForm ? addressToEdit : undefined}
          onCancelClick={() => {
            setAddressToEdit({} as AddressBookSchema);
            setIsFormVisible(false);
            setIsNewAddressForm(false);
          }}
          onConfirmClick={onAddressSave}
          onDelete={(id) =>
            deleteAddress(id, {
              text: translate('browserView.addressBook.toast.deleteAddress'),
              icon: DeleteIcon
            })
          }
          visible={isFormVisible}
          useNewAddressForm={isNewAddressForm}
        />
      </SectionLayout>
    </Layout>
  );
});
