/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_0_5_4 = (): React.ReactElement => (
  <ul style={{ listStyleType: 'disc', margin: 0 }}>
    <li>
      Updated the LedgerJS package including the upcoming Ledger Cardano App 5.0.0 and Babbage support, and Trezor
      Connect update to V9.
    </li>
    <li>
      We integrated cardano-wallet v2022-10-06 which is compatible with the Babbage era and fixes the fee calculation
      performance deterioration.
    </li>
    <li>
      We introduced an optional anonymous usage data analytics collection that will help the team to prioritize new
      features and bug fixing.
    </li>
  </ul>
);

export default ReleaseNote_0_5_4;
