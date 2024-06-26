import * as React from 'react';
import { AddressTag, AddressTagVariants } from '@input-output-hk/lace-ui-toolkit';
import type { TFunction } from 'i18next';

export type AddressTagTranslations = { own: string; foreign: string };

export const getAddressTagTranslations = (t: TFunction): AddressTagTranslations => ({
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
