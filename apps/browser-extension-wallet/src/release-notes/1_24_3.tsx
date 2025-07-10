/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_24_3 = (): React.ReactElement => (
  <>
    <p>This update includes key stability and accuracy improvements:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>Disabled bfcache to improve performance for larger wallets</li>
      <li>DRep ID now displays correctly when signing with a DRep key (CIP-30)</li>
      <li>Improved Bitcoin fee precision when sending small amounts.</li>
    </ul>
  </>
);

export default ReleaseNote_1_24_3;
