import { walkInbox } from '../acc/inbox-walk';
import { createIndexerClient } from '../infra/indexer';

import { queryAccountLedger } from './account-call';
import { inKeySession } from './key-session';
import { readAccountInbox } from './rotation';

import type { AccountCallInput, FlowContext } from './types';
import type { ShieldedHolding } from '@lace-contract/passport';

/** The account whose holdings are read; nothing else of its state matters. */
export type ReadHoldingsInput = Pick<AccountCallInput, 'account'>;

/**
 * What a completed read leaves behind: every unspent holding the chain
 * confirmed, and how many inbox entries were passed over as noise.
 */
export type ShieldedHoldings = {
  holdings: ShieldedHolding[];
  skippedEntries: number;
};

/**
 * Reads the account's shielded holdings from public chain data: the
 * contract's inbox is walked with the account secrets this device's own
 * envelopes deliver, the one deriving the ledger's `enc_key` first and
 * the older ones after it, so a coin a racing sender or an interrupted
 * rotation left under an earlier key is still found, and each coin that
 * opens is kept only once its commitment is found among the outputs the
 * chain created for the account, with the tree index it took, and only
 * while its nullifier is not among those the chain recorded. The
 * envelopes are opened inside one key session, so the walk costs one
 * ceremony however many entries the inbox holds, and none at all when
 * it holds no coin to open; only the opened coin descriptions reach this
 * flow, never a secret. Nothing is written: no record, no chain call.
 *
 * A record whose address holds no live contract rejects with
 * AccountContractMissingError, and an inbox holding no envelope of this
 * device that opens the ledger's `enc_key` with EncryptionKeyMismatchError
 * rather than an inbox read as empty. An entry that fails to open or
 * describes a coin the chain never created is skipped and counted, never
 * an error; a coin the account spent is left out without being counted;
 * the account keys and grant bookkeeping the inbox also holds
 * are not coins and are not counted.
 *
 * Reports no intermediate stage: the ceremony and the indexer reads all
 * settle before there is anything to report.
 */
export const readShieldedHoldings = async (
  { account }: ReadHoldingsInput,
  { seams }: FlowContext,
): Promise<ShieldedHoldings> => {
  const { passportAuthoriser, passportEncryptionKey, passportNetwork } = seams;
  const indexer = createIndexerClient({
    indexerUrl: passportNetwork.indexerUrl,
    indexerWsUrl: passportNetwork.indexerWsUrl,
  });
  const ledgerState = await queryAccountLedger(indexer, account.address);
  const { holdings, skippedEntries } = await walkInbox({
    address: account.address,
    ledgerState,
    indexer,
    openEntries: async entries =>
      inKeySession(passportAuthoriser, { kind: 'read-holdings' }, async () => {
        const { keyring } = readAccountInbox(
          account.address,
          ledgerState,
          await passportEncryptionKey.readerPublicKey(
            passportNetwork.networkId,
          ),
        );
        const opened = await passportEncryptionKey.openInbox(
          passportNetwork.networkId,
          keyring,
          entries,
        );
        return opened.map(entry =>
          entry?.kind === 'coin' ? entry.coin : null,
        );
      }),
  });
  return { holdings, skippedEntries };
};
