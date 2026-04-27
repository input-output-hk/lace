import type { ReactNode } from 'react';

import React from 'react';

import { BlurTextView, IndexedChip } from '../../atoms';

export interface MnemonicWordProps {
  index: number;
  children: ReactNode;
  isBlurred: boolean;
  testID?: string;
}

export const MnemonicWord: React.FC<MnemonicWordProps> = ({
  index,
  children,
  isBlurred,
  testID,
}) => {
  return (
    <IndexedChip index={index} testID={testID}>
      <BlurTextView
        isBlurred={isBlurred}
        testID={testID ? `${testID}-blur` : undefined}>
        {children}
      </BlurTextView>
    </IndexedChip>
  );
};
