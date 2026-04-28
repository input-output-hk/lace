import { ActivityType } from '@lace-contract/activities';
import flatMap from 'lodash/flatMap';
import uniq from 'lodash/uniq';

import type { TxOutputInput, TxSummary } from '../../types';

const MAX_SUMMARY_ADDRESSES = 5;

export type GetTransactionDataParams = {
  addrOutputs: TxOutputInput[];
  addrInputs: TxOutputInput[];
  accountAddresses: string[];
  isIncomingTransaction: boolean;
};

export const getTransactionData = ({
  addrOutputs,
  addrInputs,
  accountAddresses,
  isIncomingTransaction,
}: GetTransactionDataParams): TxSummary[] => {
  // For incomming type of tx the sender addresses will be all addresses available in activityInfo?.tx.addrInputs list (except the current one)
  if (isIncomingTransaction) {
    const outputData = addrOutputs.filter(output =>
      accountAddresses.includes(output.addr),
    );
    const addrs = uniq(
      flatMap(addrInputs, output =>
        !accountAddresses.includes(output.addr) ? [output.addr] : [],
      ),
    );

    return outputData.map(output => ({
      ...output,
      // Show up to 5 addresses below multiple addresses (see LW-4040)
      addr: addrs.slice(0, MAX_SUMMARY_ADDRESSES),
      type: ActivityType.Receive,
    }));
  }

  // For outgoing/sent type of tx the receiver addresses will be all addresses available in activityInfo?.tx.addrOutputs list (except the current one)
  return addrOutputs
    .filter(output => !accountAddresses.includes(output.addr))
    .map(output => ({
      ...output,
      addr: Array.isArray(output.addr) ? output.addr : [output.addr],
      type: ActivityType.Send,
    }));
};
