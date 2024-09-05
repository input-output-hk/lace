import React from 'react';
import { Button } from '@input-output-hk/lace-ui-toolkit';
import LaceLogoSwirlIcon from '../../assets/lace-logo-swirls.svg';

export const DownloadButton = ({
  title,
  url,
  target = '_blank',
  ...props
}: {
  title: string;
  url: string;
  target?: string;
  disabled?: boolean;
}): JSX.Element => (
  <Button.Primary icon={<LaceLogoSwirlIcon />} label={title} onClick={() => window.open(url, target)} {...props} />
);
