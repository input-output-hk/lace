/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_2_0 = (): React.ReactElement => (
  <>
    <p>Introducing Lace 1.2.0 This version supports the following features:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>Organizing NFTs in folders</li>
      <li>Hide/unhide the wallet balance</li>
      <li>Improved wallet balance calculation</li>
      <li>Improved DApp connector</li>
      <li>Added performance improvements for token information requests</li>
    </ul>
    <p>
      Check out the details in the{' '}
      <a href="https://www.lace.io/blog/join-us-on-a-tour-of-lace-1-2" target="_blank">
        blog
      </a>
    </p>
  </>
);

export default ReleaseNote_1_2_0;
