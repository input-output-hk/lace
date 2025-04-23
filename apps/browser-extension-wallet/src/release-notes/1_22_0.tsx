/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_22_0 = (): React.ReactElement => (
  <>
    <p>
      <strong>Features</strong>
    </p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>
        <strong>Bitcoin Beta Launch</strong> Users in our beta program can now store and manage BTC directly from Lace.
      </li>
      <li>
        <strong>Firefox Support</strong> You can now access Lace directly from one of the world's most popular browsers.
      </li>
    </ul>
    <br />
    <p>
      <strong>Fixes</strong>
    </p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>
        <strong>DRep Identification</strong> We've corrected an issue where some DReps or direct voters were
        experiencing issues using governance DApps
      </li>
      <li>
        <strong>Hardware Wallets</strong> We've fixed an issue relating to output format mappings
      </li>
    </ul>
  </>
);

export default ReleaseNote_1_22_0;
