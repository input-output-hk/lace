import { useState } from 'react';
import { v1 as uuid } from 'uuid';
import type { Meta } from '@storybook/react';
import { AddCoSigners } from './AddCoSigners';
import { CoSigner } from './type';

const meta: Meta<typeof AddCoSigners> = {
  component: AddCoSigners,
  parameters: {
    layout: 'centered',
  },
  title: 'Components /AddCoSigners',
};

export default meta;

export const Overview = (): JSX.Element => {
  const [coSigners, setCoSigners] = useState<CoSigner[]>([
    { id: uuid(), keys: '', name: '' },
    { id: uuid(), keys: '', name: '' },
    { id: uuid(), keys: '', name: '' },
  ]);

  return (
    <AddCoSigners
      onBack={() => void 0}
      onNext={() => void 0}
      coSigners={coSigners}
      onValueChange={(coSigner) =>
        setCoSigners(coSigners.map((signer) => (signer.id === coSigner.id ? coSigner : signer)))
      }
      coSignersDirty={[]}
      errors={[]}
    />
  );
};
