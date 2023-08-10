/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_4_0 = (): React.ReactElement => (
  <>
    <p>Introducing Lace 1.4.0 This version supports the following features:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>Feature: personalized ADA handles are now shown in the NFT screen</li>
      <li>Feature: alert a user when ADA handle in the Address book was transferred to another address</li>
      <li>Bugfix: the recipient’s address is now displayed once on the Send screen on the Popup view</li>
      <li>Bugfix: removed unnecessary address validations to improve Lace performance</li>
      <li>
        Bugfix: once the "All done!" transaction confirmation screen is closed, a user is not shown it again when
        starting a new transaction
      </li>
      <li>Several other UI improvements</li>
    </ul>
    <p>
      Check out the details in the{' '}
      <a href="https://www.lace.io/blog/lace-1-4-release" target="_blank">
        blog
      </a>
    </p>
  </>
);

export default ReleaseNote_1_4_0;
