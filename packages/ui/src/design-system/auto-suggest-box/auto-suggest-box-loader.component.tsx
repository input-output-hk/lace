import React from 'react';

import { ReactComponent as LoadingIcon } from '@lace/icons/dist/LoadingComponent';
import cn from 'classnames';

import { Box } from '../box';
import { Loader as LoaderUi } from '../loader';

import * as cx from './auto-suggest-box-loader.css';

export interface Props {
  isValidating?: boolean;
}

export const Loader = ({ isValidating }: Readonly<Props>): JSX.Element => {
  if (isValidating === undefined) {
    return <></>;
  }

  return (
    <Box className={cn(cx.loader, { [cx.visible]: isValidating })}>
      <LoaderUi w="$24" h="$24" icon={LoadingIcon} />
    </Box>
  );
};
