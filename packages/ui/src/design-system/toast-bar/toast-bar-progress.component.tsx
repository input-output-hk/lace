import React from 'react';

import * as RadixUIProgress from '@radix-ui/react-progress';

import * as cx from './toast-bar-progress.css';

interface Props {
  progress: number;
}

export const Progress = ({ progress }: Readonly<Props>): JSX.Element => {
  return (
    <RadixUIProgress.Root className={cx.root} value={progress}>
      <RadixUIProgress.Indicator
        className={cx.indicator}
        style={{ transform: `translateX(-${100 - progress}%)` }}
      />
    </RadixUIProgress.Root>
  );
};
