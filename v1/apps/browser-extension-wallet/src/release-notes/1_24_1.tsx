/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_24_1 = (): React.ReactElement => (
  <>
    <p>
      <strong>Warning</strong> Do not import Bitcoin accounts that contain inscriptions (such as Ordinals or Runes) or
      receive inscriptions in an account created within Lace. Lace currently does not support inscriptions, and ignoring
      this advice may result in loss of assets.
    </p>
    <p>We've also:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>Updated our knowledge articles about supported governance features</li>
      <li>Updated Preprod link for Gov.Tools</li>
    </ul>
  </>
);

export default ReleaseNote_1_24_1;
