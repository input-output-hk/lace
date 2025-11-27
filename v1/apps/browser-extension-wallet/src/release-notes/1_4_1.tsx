/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_4_1 = (): React.ReactElement => (
  <>
    <p>Introducing Lace 1.4.1 This hotfix version solves the following:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>Bugfix: fixed an issue where wallets with burned assets were displaying all NFTs as duplicates</li>
      <li>Bugfix: fixed a minor wrong copy when a bookmark item had an outdated handle</li>
      <li>Bugfix: fixed a minor user interface error when sending funds to a handle</li>
    </ul>
    <p>
      Check out the details in the{' '}
      <a href="https://www.lace.io/blog/lace-1-4-release" target="_blank">
        blog
      </a>
    </p>
  </>
);

export default ReleaseNote_1_4_1;
