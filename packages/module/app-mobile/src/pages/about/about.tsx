import { OptionList } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAboutProps } from './useAboutProps';

export const AboutPage = () => {
  const { aboutOptions, title, subtitle } = useAboutProps();

  return (
    <OptionList options={aboutOptions} title={title} subtitle={subtitle} />
  );
};
