/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_21_0 = (): React.ReactElement => (
  <>
    <p>This update brings even more improvements to your Web3 experience:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>
        <strong>View Raw Data (CBOR): </strong>Now available in DApp transaction confirmations (just like in Nami Mode!)
      </li>
      <li>
        <strong>Better Stability: </strong>Improved handling of tab API errors
      </li>
      <li>
        <strong>Enhanced Errors: </strong>We'll show you what went wrong if there is an issue building a transaction
      </li>
      <li>
        <strong>Fixes: </strong>Correct display of incoming self-transaction amounts
      </li>
    </ul>
  </>
);

export default ReleaseNote_1_21_0;
