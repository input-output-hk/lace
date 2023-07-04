/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_3_0 = (): React.ReactElement => (
  <>
    <p>Introducing Lace 1.3.0 This version supports the following features:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>ADA handle support</li>
      <li>See and spend tokens from other addresses</li>
      <li>Sign CIP30 transactions with Ledger Hardware Wallet</li>
      <li>Responsive layout improvements - now supporting window width of 668px or more</li>
    </ul>
    <p>
      Check out the details in the{' '}
      <a href="https://www.lace.io/blog/join-us-on-a-tour-of-lace-1-3" target="_blank">
        blog
      </a>
    </p>
  </>
);

export default ReleaseNote_1_3_0;
