/**
 * Deterministic props for the ui-toolkit Contact (address book row) render
 * benchmark, in the shape the Send address book feeds each row
 * (packages/next/ui/src/screens/Send/AddressBook.tsx). Every MULTI_EVERY-th
 * contact holds several addresses so the collapsed multi-address preview (and
 * the expand interaction) is part of the measurement. No
 * Date.now()/Math.random().
 */
import type React from 'react';

import noop from 'lodash/noop';

import type { Contact } from '../../src';

type ContactProps = React.ComponentProps<typeof Contact>;

const NAMES = [
  'Alice',
  'Bob',
  'Carol',
  'Dave',
  'Erin',
  'Frank',
  'Grace',
  'Heidi',
  'Ivan',
  'Judy',
];

const MULTI_EVERY = 5;

const cardanoAddress = (index: number) =>
  `addr_test1q${String(index).padStart(6, '0')}perfcontact`;
const bitcoinAddress = (index: number) =>
  `bc1q${String(index).padStart(6, '0')}perfcontact`;

export const makeContactProps = (count: number): ContactProps[] =>
  Array.from({ length: count }, (_, index) => {
    const isMulti = index % MULTI_EVERY === 0;
    return {
      name: `${NAMES[index % NAMES.length]} ${index}`,
      addresses: isMulti
        ? [
            { address: cardanoAddress(index), blockchainName: 'Cardano' },
            { address: bitcoinAddress(index), blockchainName: 'Bitcoin' },
            {
              address: cardanoAddress(index + 1000),
              blockchainName: 'Cardano',
            },
          ]
        : [{ address: cardanoAddress(index), blockchainName: 'Cardano' }],
      chainIcons: isMulti
        ? (['Cardano', 'Bitcoin'] as const)
        : (['Cardano'] as const),
      quickActions: { onSelectAddress: noop },
      testID: `perf-contact-${index}`,
    };
  });
