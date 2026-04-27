import { useTranslation } from '@lace-contract/i18n';
import { CustomTag } from '@lace-lib/ui-toolkit';
import React from 'react';

import { capitalizeFirstLetter } from './formatting';

export const useAddressTag = (ownAddresses: string[] = []) => {
  const { t } = useTranslation();

  const isOwnAddress = (address: string) => {
    return ownAddresses.includes(address);
  };

  const renderAddressTag = (address: string) => {
    const content = isOwnAddress(address)
      ? t('v2.activity-details.sheet.own')
      : t('v2.activity-details.sheet.foreign');

    const color = isOwnAddress(address) ? 'negative' : 'secondary';

    return (
      <CustomTag
        label={capitalizeFirstLetter(content)}
        color={color}
        size="M"
        backgroundType="semiTransparent"
      />
    );
  };

  return { isOwnAddress, renderAddressTag };
};
