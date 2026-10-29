import { failCustodyBuild } from './build-failure';
import { buildCustodyCreation } from './create-custody-account';
import { resolveCustodyAccount } from './custody-account';
import { loadCustodyChain } from './custody-chain';
import { buildCustodyGrantSpend } from './custody-grant-spend';
import { buildCustodyOwnerOperation } from './custody-owner-operations';

import type { CustodyAccountSnapshot } from './custody-account';
import type { Cardano, EraSummary } from '@cardano-sdk/core';
import type {
  CardanoCustodyAccountOperation,
  CardanoCustodyBuildRequest,
  CardanoCustodyBuildResult,
  CardanoProvider,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';

/** Where a custody build reads the store and the chain. */
interface CustodyBuildSources {
  readonly chainId: Cardano.ChainId | undefined;
  readonly eraSummaries: EraSummary[] | undefined;
  readonly snapshot: (accountId: AccountId) => Promise<CustodyAccountSnapshot>;
  readonly provider: CardanoProvider;
  /** POSIX milliseconds of the build. */
  readonly now: number;
}

const ACCOUNT_OPERATION_TYPES: ReadonlySet<string> = new Set<
  CardanoCustodyAccountOperation['type']
>([
  'add-device',
  'delegate',
  'grant-spend',
  'issue-grant',
  'owner-spend',
  'remove-device',
  'replace-grant',
  'revoke-all-grants',
  'revoke-grant',
  'sweep-grants',
  'withdraw-rewards',
]);

const refuseOperation = (type: string): never =>
  failCustodyBuild({
    code: 'invalid-operation',
    reason: 'unknown-operation',
    message: `Unknown custody operation ${type} for this request`,
  });

const refuseFundingMode = (mode: string): never =>
  failCustodyBuild({
    code: 'invalid-operation',
    reason: 'funding-mode',
    message: `Funding mode ${mode} does not fit the operation`,
  });

/**
 * Builds the custody transaction a request asks for. Creation runs in the
 * sponsor's fee mode on the current network. Every operation on an
 * existing account runs in collateral mode, with the account paying: the
 * sponsor's fee mode serves creation only.
 */
export const buildCustodyTransaction = async (
  request: CardanoCustodyBuildRequest,
  sources: CustodyBuildSources,
): Promise<CardanoCustodyBuildResult> => {
  const chain = await loadCustodyChain(sources);
  if (!('accountId' in request)) {
    const { operation, funding } = request;
    if (operation.type !== 'create') return refuseOperation(operation.type);
    if (funding.mode !== 'fee') return refuseFundingMode(funding.mode);
    return buildCustodyCreation(operation, funding, chain);
  }
  const { accountId, operation, funding } = request;
  if (!ACCOUNT_OPERATION_TYPES.has(operation.type)) {
    return refuseOperation(operation.type);
  }
  if (funding.mode !== 'collateral') return refuseFundingMode(funding.mode);
  const context = await resolveCustodyAccount(
    accountId,
    await sources.snapshot(accountId),
    chain,
  );
  return operation.type === 'grant-spend'
    ? buildCustodyGrantSpend({ operation, funding }, context, chain)
    : buildCustodyOwnerOperation({ operation, funding }, context, chain);
};
