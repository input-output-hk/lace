/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_29_0 = (): React.ReactElement => (
  <>
    <p>
      <strong>Trezor Derivation Path Support</strong>
      <br />
      Lace now supports 3 Cardano derivation types for Trezor wallets:
    </p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>icarus</li>
      <li>icarus-trezor</li>
      <li>ledger</li>
    </ul>
    <p>This should resolve connection issues previously reported by some Trezor users.</p>
  </>
);

export default ReleaseNote_1_29_0;
