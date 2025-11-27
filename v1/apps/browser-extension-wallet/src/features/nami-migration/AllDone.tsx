import React from 'react';

import { AllDone as View } from '@lace/core';

export const AllDone = (): JSX.Element => (
  <View
    onClose={() => {
      window.close();
    }}
  />
);
