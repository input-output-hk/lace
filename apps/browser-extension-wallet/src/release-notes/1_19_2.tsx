/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_19_2 = (): React.ReactElement => (
  <>
    <p>This release:</p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>Fixes an issue with the initial load of the DApp explorer</li>
      <li>Improves wallet onboarding performance for multi-address accounts</li>
      <li>Optimizes idle detection</li>
      <li>Slightly extends the background fetch interval</li>
      <li>Prevent crashing when removing the last wallet when in Nami mode</li>
    </ul>
  </>
);

export default ReleaseNote_1_19_2;
