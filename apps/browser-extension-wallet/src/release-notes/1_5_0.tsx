/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_5_0 = (): React.ReactElement => (
  <>
    <p>Introducing Lace 1.5.0 This version supports the following features:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>Feature: Stake to multiple pools</li>
      <li>Feature: More Ledger support</li>
      <li>Feature: Update handles when sending funds</li>
      <li>Feature: Easier collateral setup</li>
    </ul>
    <p>
      Check out the details in the{' '}
      <a href="https://www.lace.io/blog/lace-1-5-release" target="_blank">
        blog
      </a>
    </p>
  </>
);

export default ReleaseNote_1_5_0;
