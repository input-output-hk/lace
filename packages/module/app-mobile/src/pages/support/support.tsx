import { OptionList } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useSupportProps } from './useSupportProps';

export const SupportPage = () => {
  const { supportOptions, title, subtitle } = useSupportProps();

  return (
    <OptionList options={supportOptions} title={title} subtitle={subtitle} />
  );
};
