import * as React from 'react';
import { AddressTag, AddressTagVariants } from '@lace/ui';
import { UseTranslate } from '@ui/hooks';

export type AddressTagTranslations = { own: string; foreign: string };

export const getAddressTagTranslations = (t: UseTranslate['t']): AddressTagTranslations => ({
  own: t('core.addressTags.own'),
  foreign: t('core.addressTags.foreign')
});

interface Props {
  handle?: string;
  address: string;
  translations: AddressTagTranslations;
  ownAddresses?: string[];
  addressToNameMap?: Map<string, string>; // address || handle, name
}

export const renderAddressTag = ({
  address,
  handle,
  translations,
  ownAddresses = [],
  addressToNameMap = new Map()
}: Props): JSX.Element => {
  const matchingAddressName = addressToNameMap.get(handle) ?? addressToNameMap.get(address);
  return ownAddresses.includes(address) ? (
    <AddressTag variant={AddressTagVariants.Own}>
      {translations.own}
      {matchingAddressName ? ` / ${matchingAddressName}` : ''}
    </AddressTag>
  ) : (
    <AddressTag variant={AddressTagVariants.Foreign}>
      {translations.foreign}
      {matchingAddressName ? ` / ${matchingAddressName}` : ''}
    </AddressTag>
  );
};
