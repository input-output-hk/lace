/* eslint-disable consistent-return, unicorn/no-array-reduce */
import {
  createTxInspector,
  delegationInspector,
  stakeKeyDeregistrationInspector,
  stakeKeyRegistrationInspector,
  withdrawalInspector,
  sentInspector,
  totalAddressOutputsValueInspector
} from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { TransactionType } from '@lace/core';
import { TxDirection, TxDirections } from '@src/types';

const { CertificateType } = Wallet.Cardano;

const hasWalletStakeAddress = (
  withdrawals: Wallet.Cardano.HydratedTx['body']['withdrawals'],
  stakeAddress: Wallet.Cardano.RewardAccount
) => withdrawals.some((item) => item.stakeAddress === stakeAddress);

interface TxTypeProps {
  type: TransactionType | 'self-rewards';
}

const conwayEraCertificatesTypes = new Set([
  CertificateType.AuthorizeCommitteeHot,
  CertificateType.RegisterDelegateRepresentative,
  CertificateType.ResignCommitteeCold,
  CertificateType.VoteRegistrationDelegation,
  CertificateType.VoteDelegation,
  CertificateType.UpdateDelegateRepresentative,
  CertificateType.UpdateDelegateRepresentative,
  CertificateType.UnregisterDelegateRepresentative,
  CertificateType.StakeVoteRegistrationDelegation,
  CertificateType.StakeVoteDelegation
]);

export const getTxDirection = ({ type }: TxTypeProps): TxDirection => {
  switch (type) {
    case 'incoming':
      return TxDirections.Incoming;
    case 'rewards':
      return TxDirections.Outgoing;
    case 'outgoing':
    case 'vote':
      return TxDirections.Outgoing;
    case 'self-rewards':
      return TxDirections.Self;
    case 'self':
      return TxDirections.Self;
  }
};

const selfTxInspector = (addresses: Wallet.Cardano.PaymentAddress[]) => (tx: Wallet.Cardano.HydratedTx) => {
  const notOwnInputs = tx.body.inputs.some((input) => !addresses.includes(input.address));
  if (notOwnInputs) return false;
  const notOwnOutputs = tx.body.outputs.some((output) => !addresses.includes(output.address));
  return !notOwnOutputs;
};

const governanceCertificateInspection = (certificates: Wallet.Cardano.Certificate[]): TransactionType => {
  const signedCertificateTypenames: Wallet.Cardano.CertificateType[] = certificates.reduce(
    (acc, cert) => [...acc, cert.__typename],
    []
  );
  // Assumes single certificate only, should update

  switch (true) {
    case signedCertificateTypenames.includes(CertificateType.RegisterDelegateRepresentative):
      return 'drepRegistration';
    case signedCertificateTypenames.includes(CertificateType.UnregisterDelegateRepresentative):
      return 'drepRetirement';
    case signedCertificateTypenames.includes(CertificateType.UpdateDelegateRepresentative):
      return 'drepUpdate';
    case signedCertificateTypenames.includes(CertificateType.VoteDelegation):
      return 'voteDelegation';
    case signedCertificateTypenames.includes(CertificateType.StakeVoteDelegation):
      return 'stakeVoteDelegation';
    case signedCertificateTypenames.includes(CertificateType.VoteRegistrationDelegation):
      return 'voteRegistrationDelegation';
    case signedCertificateTypenames.includes(CertificateType.StakeVoteRegistrationDelegation):
      return 'stakeVoteRegistrationDelegation';
    case signedCertificateTypenames.includes(CertificateType.AuthorizeCommitteeHot):
      return 'authCommitteeHot';
    case signedCertificateTypenames.includes(CertificateType.ResignCommitteeCold):
      return 'resignComitteeCold';
  }
};

const getWalletAccounts = (walletAddresses: Wallet.KeyManagement.GroupedAddress[]) =>
  walletAddresses.reduce(
    (acc, curr) => ({
      paymentAddresses: [...acc.paymentAddresses, curr.address],
      rewardAccounts: [...acc.rewardAccounts, curr.rewardAccount]
    }),
    { paymentAddresses: [], rewardAccounts: [] }
  );

const txIncludesConwayCertificates = (certificates?: Wallet.Cardano.Certificate[]) =>
  certificates.length > 0
    ? certificates.some((certificate) => conwayEraCertificatesTypes.has(certificate.__typename))
    : false;

const isTxWithRewardsWithdrawal = (
  totalWithdrawals: bigint,
  walletAddresses: Wallet.KeyManagement.GroupedAddress[],
  txWithdrawals?: Wallet.Cardano.Withdrawal[]
) =>
  totalWithdrawals > BigInt(0) &&
  txWithdrawals.length > 0 &&
  walletAddresses.some((addr) => hasWalletStakeAddress(txWithdrawals, addr.rewardAccount));

// eslint-disable-next-line complexity
export const inspectTxType = ({
  walletAddresses,
  tx
}: {
  walletAddresses: Wallet.KeyManagement.GroupedAddress[];
  tx: Wallet.Cardano.HydratedTx;
}): TransactionType | 'self-rewards' => {
  const { paymentAddresses, rewardAccounts } = getWalletAccounts(walletAddresses);

  const inspectionProperties = createTxInspector({
    sent: sentInspector({
      addresses: paymentAddresses,
      rewardAccounts
    }),
    totalWithdrawals: withdrawalInspector,
    delegation: delegationInspector,
    stakeKeyRegistration: stakeKeyRegistrationInspector,
    stakeKeyDeregistration: stakeKeyDeregistrationInspector,
    selfTransaction: selfTxInspector(paymentAddresses)
  })(tx);

  if (txIncludesConwayCertificates(tx.body.certificates)) {
    return governanceCertificateInspection(tx.body.certificates);
  }

  const withRewardsWithdrawal = isTxWithRewardsWithdrawal(
    inspectionProperties.totalWithdrawals,
    walletAddresses,
    tx.body.withdrawals
  );

  // TODO: refactor when more than one type can be accounted for
  if (inspectionProperties.sent.inputs.length > 0) {
    switch (true) {
      case !!inspectionProperties.delegation[0]?.poolId:
        return 'delegation';
      case inspectionProperties.stakeKeyRegistration.length > 0:
        return 'delegationRegistration';
      case inspectionProperties.stakeKeyDeregistration.length > 0:
        return 'delegationDeregistration';
      case withRewardsWithdrawal && inspectionProperties.selfTransaction:
        return 'self-rewards';
      case withRewardsWithdrawal:
        return 'rewards';
      case tx.body.votingProcedures?.length > 0: // Voting procedures take priority over proposals
        return 'vote';
      case tx.body.proposalProcedures?.length > 0:
        return 'submitProposal';
      case inspectionProperties.selfTransaction:
        return 'self';
      default:
        return 'outgoing';
    }
  }

  if (withRewardsWithdrawal) return 'rewards';
  return 'incoming';
};

export const inspectTxValues = ({
  addresses,
  tx,
  direction
}: {
  addresses: Wallet.KeyManagement.GroupedAddress[];
  tx: Wallet.Cardano.HydratedTx;
  direction: TxDirection;
}): Wallet.Cardano.Value => {
  const paymentAddresses = addresses.map((addr) => addr.address);

  const targetAddresses =
    direction === TxDirections.Outgoing
      ? tx.body.outputs.filter((item) => !paymentAddresses.includes(item.address)).map((item) => item.address)
      : paymentAddresses;

  const inspectionProperties = createTxInspector({
    totalOutputsValue: totalAddressOutputsValueInspector(targetAddresses)
  })(tx);

  return inspectionProperties.totalOutputsValue;
};
