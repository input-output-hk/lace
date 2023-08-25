import { AddressBookSchema } from '@lib/storage';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import {
  AnalyticsEventNames,
  MatomoEventActions,
  MatomoEventCategories
} from '@providers/AnalyticsProvider/analyticsTracker';
import { getAddressToSave } from '@src/utils/validators';
import AddIcon from '@assets/icons/add.component.svg';
import EditIcon from '@assets/icons/edit.component.svg';
import { useTranslation } from 'react-i18next';
import { useAddressBookContext } from '@src/features/address-book/context';
import { useHandleResolver } from './useHandleResolver';

interface useOnAddressSaveInterface {
  onSaveAddressActions: (
    address: AddressBookSchema | Omit<AddressBookSchema, 'id' | 'network'> | Omit<AddressBookSchema, 'id'>,
    addressToEdit: AddressBookSchema | Omit<AddressBookSchema, 'id' | 'network'>
  ) => Promise<string>;
}

export const useOnAddressSave = (): useOnAddressSaveInterface => {
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const { utils } = useAddressBookContext();
  const { saveRecord: saveAddress, updateRecord: updateAddress } = utils;
  const handleResolver = useHandleResolver();

  const onSaveAddressActions = async (
    address: AddressBookSchema | Omit<AddressBookSchema, 'id' | 'network'> | Omit<AddressBookSchema, 'id'>,
    addressToEdit: AddressBookSchema | Omit<AddressBookSchema, 'id' | 'network'>
  ) => {
    analytics.sendEventToMatomo({
      category: MatomoEventCategories.ADDRESS_BOOK,
      action: MatomoEventActions.CLICK_EVENT,
      name: AnalyticsEventNames.AddressBook.ADD_ADDRESS_BROWSER
    });

    const addressToSave = await getAddressToSave({ address, handleResolver });

    if ('id' in addressToEdit) {
      return updateAddress(addressToEdit.id, addressToSave, {
        text: t('browserView.addressBook.toast.editAddress'),
        icon: EditIcon
      });
    }
    return saveAddress(addressToSave, {
      text: t('browserView.addressBook.toast.addAddress'),
      icon: AddIcon
    });
  };

  return { onSaveAddressActions };
};
