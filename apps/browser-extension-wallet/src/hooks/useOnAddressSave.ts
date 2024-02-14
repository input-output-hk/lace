import { AddressBookSchema } from '@lib/storage';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
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
    const addressToSave = await getAddressToSave({ address, handleResolver });

    if ('id' in addressToEdit) {
      analytics.sendEventToPostHog(PostHogAction.AddressBookAddressRecordEditAddressDoneClick);
      return updateAddress(addressToEdit.id, addressToSave, {
        text: t('browserView.addressBook.toast.editAddress'),
        icon: EditIcon
      });
    }

    analytics.sendEventToPostHog(PostHogAction.AddressBookAddNewAddressSaveAddressClick);
    return saveAddress(addressToSave, {
      text: t('browserView.addressBook.toast.addAddress'),
      icon: AddIcon
    });
  };

  return { onSaveAddressActions };
};
