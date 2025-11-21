import React from 'react';
import { Button } from '@input-output-hk/lace-ui-toolkit';
import LaceLogoSwirlIcon from '../../assets/lace-logo-swirls.component.svg';
import Icon from '@ant-design/icons';

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
  <Button.Primary
    icon={<Icon component={LaceLogoSwirlIcon} />}
    label={title}
    onClick={() => window.open(url, target)}
    {...props}
  />
);
