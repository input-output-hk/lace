import React, { ReactElement, useState } from 'react';
import type { Meta } from '@storybook/react';
import { QuorumOption, QuorumOptionValue, QuorumRadioOption } from './QuorumOption.component';

const meta: Meta<typeof QuorumOption> = {
  component: QuorumOption,
  parameters: {
    layout: 'centered',
  },
  title: 'Shared Wallets / Components / Quorum option',
};

export default meta;

const noop = (): void => void 0;

export const QuorumOptionComponent = (): ReactElement => {
  const [value, setValue] = useState<QuorumOptionValue>({ option: QuorumRadioOption.AllAddresses });
  return <QuorumOption onBack={noop} onChange={setValue} onNext={noop} totalCosignersNumber={2} value={value} />;
};
