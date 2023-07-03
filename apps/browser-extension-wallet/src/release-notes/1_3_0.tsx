/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_3_0 = (): React.ReactElement => (
  <>
    <p>Introducing Lace 1.3.0 This version supports the following features:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>ADA handle: We partner up with the ADA handle team to release customizable handles in Lace</li>
      <li>HD Wallet Migration: you can see and spend tokens from other addresses</li>
      <li>Full Ledger HW Wallet support: sign CIP30 transactions with your device</li>
      <li>Responsive UX: We now support X, Y and Z screen sizes</li>
      <li>Edge browser support</li>
    </ul>
    <p>
      Check out the details in the{' '}
      <a href="https://www.lace.io/blog/join-us-on-a-tour-of-lace-1-2" target="_blank">
        blog
      </a>
    </p>
  </>
);

export default ReleaseNote_1_3_0;
