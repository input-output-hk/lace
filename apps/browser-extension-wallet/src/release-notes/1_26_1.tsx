/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_26_1 = (): React.ReactElement => (
  <>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>Improved hardware wallet compatibility for message signing with larger payloads.</li>
      <li>Fixes an issue impacting some Ledger users during the Glacier Drop claim process.</li>
    </ul>
    <p>
      For the latest updates on Midnight Glacier Drop claims, follow{' '}
      <a href="https://x.com/midnightfdn" target="_blank">
        @midnightfdn
      </a>
      .
    </p>
  </>
);

export default ReleaseNote_1_26_1;
