import React, { useState } from 'react';
import type { Meta } from '@storybook/react';

import { AddCoSigners } from './AddCoSigners';
import { v1 as uuid } from 'uuid';
import { CoSigner } from './type';

const meta: Meta<typeof AddCoSigners> = {
  title: 'Shared Wallets/AddCoSigners',
  component: AddCoSigners,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

export const Overview = (): JSX.Element => {
  const [coSigners, setCoSigners] = useState<CoSigner[]>([
    { id: uuid(), keys: '', name: '' },
    { id: uuid(), keys: '', name: '' }
  ]);

  return (
    <AddCoSigners
      onBack={() => void 0}
      onNext={() => void 0}
      coSigners={coSigners}
      onValueChange={(coSigner) => setCoSigners(coSigners.map((c) => (c.id === coSigner.id ? coSigner : c)))}
      errors={[]}
    />
  );
};
