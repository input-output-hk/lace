import React from 'react';

import { ReactComponent as CheckIcon } from '@lace/icons/dist/CheckFileUploadComponent';
import { ReactComponent as LoadingIcon } from '@lace/icons/dist/LoadingComponent';
import cn from 'classnames';

import { Box } from '../box';
import { Loader } from '../loader';

import * as cx from './auto-suggest-box-icon.css';
import { ValidationStatus } from './auto-suggest-box-types';

export interface Props {
  status?: ValidationStatus;
}

export const Icon = ({ status }: Readonly<Props>): JSX.Element => {
  const isValidating = status === ValidationStatus.Validating;
  const isValidated = status === ValidationStatus.Validated;

  if (status === undefined) {
    return <></>;
  }

  return (
    <Box
      className={cn(cx.icon, {
        [cx.visible]: Boolean(status),
        [cx.loader]: isValidating,
        [cx.check]: isValidated,
      })}
    >
      {isValidating && <Loader w="$24" h="$24" icon={LoadingIcon} />}
      {isValidated && <CheckIcon />}
    </Box>
  );
};
