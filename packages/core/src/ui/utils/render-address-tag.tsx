import * as React from 'react';
import { AddressTag, AddressTagVariants } from '@lace/ui';
import { UseTranslate } from '@ui/hooks';

export type AddressTagTranslations = { own: string; foreign: string };

export const getAddressTagTranslations = (t: UseTranslate['t']): AddressTagTranslations => ({
  own: t('core.addressTags.own'),
  foreign: t('core.addressTags.foreign')
});

interface Props {
  address: string;
  translations: AddressTagTranslations;
  ownAddresses?: string[];
}

export const renderAddressTag = ({ address, translations, ownAddresses = [] }: Props): JSX.Element =>
  ownAddresses.includes(address) ? (
    <AddressTag variant={AddressTagVariants.Own}>{translations.own}</AddressTag>
  ) : (
    <AddressTag variant={AddressTagVariants.Foreign}>{translations.foreign}</AddressTag>
  );
