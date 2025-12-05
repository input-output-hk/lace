/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_19_3 = (): React.ReactElement => (
  <>
    <p>This release:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>Fixes a bug with rewards display</li>
      <li>Removes a race condition impacting some DApps fetching the wallet's UTxO set</li>
      <li>Further optimisations to reduce network demand</li>
    </ul>
  </>
);

export default ReleaseNote_1_19_3;
