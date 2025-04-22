/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_21_2 = (): React.ReactElement => (
  <>
    <p>
      A previously used vanity Discord invite link has expired and is now controlled by a third party. It may lead to
      malicious content or impersonation.
    </p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>
        <strong>Do NOT click or trust the old link. </strong>If you've already joined the server through that link,
        please leave and report it immediately. The only official and safe invite going forward is:
        https://discord.gg/lace-1073034511664824360.
      </li>
    </ul>
  </>
);

export default ReleaseNote_1_21_2;
