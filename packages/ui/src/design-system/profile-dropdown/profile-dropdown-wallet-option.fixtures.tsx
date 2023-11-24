/* eslint-disable react/no-multi-comp */
import React from 'react';

import { Variants } from '../decorators';

import { WalletOption } from './profile-dropdown-wallet-option.component';

import type { WalletType } from './profile-dropdown.data';

export const WalletOptionSample = ({
  disabled,
  id,
  type = 'hot',
}: Readonly<{
  disabled?: boolean;
  id?: string;
  type?: WalletType;
}>): JSX.Element => (
  <div style={{ width: '228px' }}>
    <WalletOption
      title="Alice's wallet"
      subtitle="Account #0"
      disabled={disabled}
      id={id}
      type={type}
    />
  </div>
);

export const WalletOptionUIStates = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <WalletOptionSample />
    </Variants.Cell>
    <Variants.Cell>
      <WalletOptionSample id="hover" />
    </Variants.Cell>
    <Variants.Cell>
      <WalletOptionSample id="pressed" />
    </Variants.Cell>
    <Variants.Cell>
      <WalletOptionSample disabled />
    </Variants.Cell>
    <Variants.Cell>
      <WalletOptionSample id="focused" />
    </Variants.Cell>
  </Variants.Row>
);
