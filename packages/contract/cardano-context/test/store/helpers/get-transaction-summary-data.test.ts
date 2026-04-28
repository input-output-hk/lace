import { ActivityType } from '@lace-contract/activities';
import { describe, test, expect } from 'vitest';

import { getTransactionData } from '../../../src/store/helpers/get-transaction-summary-data';
import {
  incomingTransactionOutput,
  outgoingTransactionOutput,
} from '../../../test/mocks';

describe('getTransactionData', () => {
  test('incoming transaction returns outputs coming into the wallet, and addresses of foreign input addresses', async () => {
    const result = getTransactionData(incomingTransactionOutput);

    expect(result).toEqual([
      {
        ...incomingTransactionOutput.addrOutputs[0],
        addr: [incomingTransactionOutput.addrInputs[0].addr],
        type: ActivityType.Receive,
      },
    ]);
  });

  test('outgoing transaction returns outputs going out of the wallet', async () => {
    const result = getTransactionData(outgoingTransactionOutput);
    expect(result).toEqual([
      {
        ...outgoingTransactionOutput.addrOutputs[0],
        addr: [outgoingTransactionOutput.addrOutputs[0].addr],
        type: ActivityType.Send,
      },
    ]);
  });
});
