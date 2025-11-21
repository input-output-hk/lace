/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_20_0 = (): React.ReactElement => (
  <>
    <p>This release:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>Rename wallets & accounts for better organization</li>
      <li>Governance tab as a starting point for an integrated experience</li>
      <li>Restored full activity feed to view all past transactions & rewards</li>
      <li>
        Improved input focusing so your password can be immediately typed when signing a DApp transaction or message
      </li>
      <li>Optimized caching for reduced network demand and increased application performance</li>
      <li>Refined landing page to help guide users switching to Nami mode</li>
      <li>Opt-in Debug Logging – control diagnostics on your terms</li>
    </ul>
    <p>
      We’re continuously improving Lace with every update — this release includes numerous bug fixes and performance
      improvements based on your feedback!
    </p>
  </>
);

export default ReleaseNote_1_20_0;
