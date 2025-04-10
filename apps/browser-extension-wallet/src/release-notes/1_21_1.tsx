/* eslint-disable camelcase */
import React from 'react';

const ReleaseNote_1_21_1 = (): React.ReactElement => (
  <>
    <p>
      This minor update introduces an optimization to improve performance and reduce unnecessary network requests
      related to ADA Handle resolution.:
    </p>
    <ul style={{ listStyleType: 'disc', margin: 0 }}>
      <li>
        <strong>Address Book Optimization: </strong>Increased the interval between ADA Handle resolution checks in the
        address book, significantly lowering the frequency of requests to enhance wallet performance
      </li>
    </ul>
  </>
);

export default ReleaseNote_1_21_1;
