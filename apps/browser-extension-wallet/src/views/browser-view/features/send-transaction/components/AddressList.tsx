import React, { useMemo, useCallback } from 'react';
import isNumber from 'lodash/isNumber';
import { useTranslation } from 'react-i18next';
import { WalletAddressList } from '@lace/core';
import { AddressBookSchema } from '@src/lib/storage';
import { withAddressBookContext, useAddressBookContext } from '@src/features/address-book/context';
import { AddressBookEmpty } from '@views/browser/features/adress-book/components/AddressBookEmpty';
import { useCurrentRow, useAddressState, useSections } from '../store';
import styles from './AddressList.module.scss';

export const AddressList = withAddressBookContext(
  ({ isPopupView, scrollableTargetId }: { isPopupView?: boolean; scrollableTargetId?: string }): React.ReactElement => {
    const { t: translate } = useTranslation();
    const { list: addressList, count: addressCount, utils } = useAddressBookContext();
    const { extendLimit } = utils;
    const { setSection } = useSections();

    const translations = {
      name: translate('core.walletAddressList.name'),
      address: translate('core.walletAddressList.address')
    };

    const [row] = useCurrentRow();

    const { setAddressValue } = useAddressState(row);

    const list: Array<Omit<AddressBookSchema, 'network'>> = useMemo(
      () =>
        addressList?.map((item: AddressBookSchema) => ({
          id: item.id,
          address: item.address,
          name: item.name,
          handleResolution: item.handleResolution,
          onClick: (addr: AddressBookSchema) => {
            setAddressValue(row, addr.address);
            setSection();
          },
          isSmall: isPopupView
        })) || [],
      [addressList, setSection, setAddressValue, row, isPopupView]
    );

    const loadMoreData = useCallback(() => {
      extendLimit();
    }, [extendLimit]);

    if (!isNumber(addressCount)) return <span />;

    return addressCount ? (
      <div id="scrollableTargetId" className={styles.listContainer}>
        <WalletAddressList
          className={styles.addressList}
          items={list}
          loadMoreData={loadMoreData}
          locale={{ emptyText: true }}
          total={addressCount}
          scrollableTargetId={scrollableTargetId || 'scrollableTargetId'}
          withHeader={false}
          translations={translations}
        />
      </div>
    ) : (
      <div className={styles.emptyContainer}>
        <AddressBookEmpty subtitle={translate('browserView.transaction.send.drawer.addressBookEmpty')} />
      </div>
    );
  }
);
