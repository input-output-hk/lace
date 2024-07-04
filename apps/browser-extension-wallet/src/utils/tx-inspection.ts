/* eslint-disable complexity */
/* eslint-disable consistent-return */
import {
  createTxInspector,
  delegationInspector,
  stakeKeyDeregistrationInspector,
  stakeKeyRegistrationInspector,
  withdrawalInspector,
  sentInspector,
  totalAddressOutputsValueInspector
} from '@cardano-sdk/core';
import { certificateInspectorFactory } from '@src/features/dapp/components/confirm-transaction/utils';
import { Wallet } from '@lace/cardano';
import {
  ActivityType,
  DelegationActivityType,
  TransactionActivityType,
  ConwayEraGovernanceActions,
  ConwayEraCertificatesTypes,
  Cip1694GovernanceActivityType
} from '@lace/core';
import { TxDirection, TxDirections } from '@src/types';

const { CertificateType, GovernanceActionType, InputSource } = Wallet.Cardano;

const hasWalletStakeAddress = (
  withdrawals: Wallet.Cardano.HydratedTx['body']['withdrawals'],
  stakeAddress: Wallet.Cardano.RewardAccount
) => withdrawals.some((item) => item.stakeAddress === stakeAddress);

interface TxTypeProps {
  type: ActivityType;
}

export const getTxDirection = ({ type }: TxTypeProps): TxDirections => {
  switch (type) {
    case TransactionActivityType.incoming:
      return TxDirections.Incoming;
    case ConwayEraGovernanceActions.vote:
    case TransactionActivityType.rewards:
    case TransactionActivityType.outgoing:
      return TxDirections.Outgoing;
    case TransactionActivityType.self:
      return TxDirections.Self;
  }
};

const governanceCertificateInspection = (
  certificates: Wallet.Cardano.Certificate[]
): ConwayEraCertificatesTypes | ConwayEraGovernanceActions => {
  const signedCertificateTypenames: Wallet.Cardano.CertificateType[] = certificates.reduce(
    (acc, cert) => [...acc, cert.__typename],
    []
  );
  // Assumes single certificate only, should update

  switch (true) {
    case signedCertificateTypenames.includes(CertificateType.RegisterDelegateRepresentative):
      return ConwayEraCertificatesTypes.RegisterDelegateRepresentative;
    case signedCertificateTypenames.includes(CertificateType.UnregisterDelegateRepresentative):
      return ConwayEraCertificatesTypes.UnregisterDelegateRepresentative;
    case signedCertificateTypenames.includes(CertificateType.UpdateDelegateRepresentative):
      return ConwayEraCertificatesTypes.UpdateDelegateRepresentative;
    case signedCertificateTypenames.includes(CertificateType.StakeVoteDelegation):
      return ConwayEraCertificatesTypes.StakeVoteDelegation;
    case signedCertificateTypenames.includes(CertificateType.StakeRegistrationDelegation):
      return ConwayEraCertificatesTypes.StakeRegistrationDelegation;
    case signedCertificateTypenames.includes(CertificateType.VoteRegistrationDelegation):
      return ConwayEraCertificatesTypes.VoteRegistrationDelegation;
    case signedCertificateTypenames.includes(CertificateType.VoteDelegation):
      return ConwayEraCertificatesTypes.VoteDelegation;
    case signedCertificateTypenames.includes(CertificateType.StakeVoteRegistrationDelegation):
      return ConwayEraCertificatesTypes.StakeVoteRegistrationDelegation;
    case signedCertificateTypenames.includes(CertificateType.AuthorizeCommitteeHot):
      return ConwayEraCertificatesTypes.AuthorizeCommitteeHot;
    case signedCertificateTypenames.includes(CertificateType.ResignCommitteeCold):
      return ConwayEraCertificatesTypes.ResignCommitteeCold;
  }
};

// Assumes single procedure only
export const cip1694GovernanceActionsInspection = (
  procedure: Wallet.Cardano.ProposalProcedure
): Cip1694GovernanceActivityType => {
  switch (procedure.governanceAction.__typename) {
    case GovernanceActionType.parameter_change_action:
      return Cip1694GovernanceActivityType.ParameterChangeAction;
    case GovernanceActionType.hard_fork_initiation_action:
      return Cip1694GovernanceActivityType.HardForkInitiationAction;
    case GovernanceActionType.treasury_withdrawals_action:
      return Cip1694GovernanceActivityType.TreasuryWithdrawalsAction;
    case GovernanceActionType.no_confidence:
      return Cip1694GovernanceActivityType.NoConfidence;
    case GovernanceActionType.update_committee:
      return Cip1694GovernanceActivityType.UpdateCommittee;
    case GovernanceActionType.new_constitution:
      return Cip1694GovernanceActivityType.NewConstitution;
    case GovernanceActionType.info_action:
      return Cip1694GovernanceActivityType.InfoAction;
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

export const txIncludesConwayCertificates = (certificates?: Wallet.Cardano.Certificate[]): boolean =>
  certificates?.length > 0
    ? certificates.some((certificate) =>
        Object.values(ConwayEraCertificatesTypes).includes(
          certificate.__typename as unknown as ConwayEraCertificatesTypes
        )
      )
    : false;

const isTxWithRewardsWithdrawal = (
  totalWithdrawals: bigint,
  walletAddresses: Wallet.KeyManagement.GroupedAddress[],
  txWithdrawals?: Wallet.Cardano.Withdrawal[]
) =>
  totalWithdrawals > BigInt(0) &&
  txWithdrawals.length > 0 &&
  walletAddresses.some((addr) => hasWalletStakeAddress(txWithdrawals, addr.rewardAccount));

const selfTxInspector = (addresses: Wallet.Cardano.PaymentAddress[]) => async (tx: Wallet.Cardano.HydratedTx) => {
  const notOwnInputs = tx.body.inputs.some((input) => !addresses.includes(input.address));
  if (notOwnInputs) return false;
  const notOwnOutputs = tx.body.outputs.some((output) => !addresses.includes(output.address));
  return !notOwnOutputs;
};

export const inspectTxType = async ({
  walletAddresses,
  tx,
  inputResolver
}: {
  walletAddresses: Wallet.KeyManagement.GroupedAddress[];
  tx: Wallet.Cardano.HydratedTx;
  inputResolver: Wallet.Cardano.InputResolver;
}): Promise<Exclude<ActivityType, TransactionActivityType.rewards>> => {
  if (tx.inputSource === InputSource.collaterals) {
    return TransactionActivityType.outgoing;
  }

  const { paymentAddresses, rewardAccounts } = getWalletAccounts(walletAddresses);

  const inspectionProperties = await createTxInspector({
    sent: sentInspector({
      addresses: paymentAddresses,
      rewardAccounts,
      inputResolver
    }),
    totalWithdrawals: withdrawalInspector,
    delegation: delegationInspector,
    stakeKeyRegistration: stakeKeyRegistrationInspector,
    stakeKeyDeregistration: stakeKeyDeregistrationInspector,
    conwayEraStakeKeyRegistration: certificateInspectorFactory(CertificateType.Registration),
    conwayEraStakeKeyDeregistration: certificateInspectorFactory(CertificateType.Unregistration),
    selfTransaction: selfTxInspector(paymentAddresses)
  })(tx);

  if (txIncludesConwayCertificates(tx.body.certificates)) {
    const inspection = governanceCertificateInspection(tx.body.certificates);
    if (inspection) {
      return inspection;
    }
  }

  const withRewardsWithdrawal = isTxWithRewardsWithdrawal(
    inspectionProperties.totalWithdrawals,
    walletAddresses,
    tx.body.withdrawals
  );

  if (inspectionProperties.sent.inputs.length > 0 || withRewardsWithdrawal) {
    switch (true) {
      case !!inspectionProperties.delegation[0]?.poolId:
        return DelegationActivityType.delegation;
      case inspectionProperties.stakeKeyRegistration.length > 0:
        return DelegationActivityType.delegationRegistration;
      case inspectionProperties.stakeKeyDeregistration.length > 0:
        return DelegationActivityType.delegationDeregistration;
      case !!inspectionProperties.conwayEraStakeKeyRegistration:
        return ConwayEraCertificatesTypes.Registration;
      case !!inspectionProperties.conwayEraStakeKeyDeregistration:
        return ConwayEraCertificatesTypes.Unregistration;
      // Voting procedures take priority over proposals
      // TODO: use proper inspector when available on sdk side (LW-9569)
      case tx.body.votingProcedures?.length > 0:
        return ConwayEraGovernanceActions.vote;
      case tx.body.proposalProcedures?.length > 0:
        return cip1694GovernanceActionsInspection(tx.body.proposalProcedures[0]);
      case inspectionProperties.selfTransaction:
        return TransactionActivityType.self;
      default:
        return TransactionActivityType.outgoing;
    }
  }

  return TransactionActivityType.incoming;
};

export const inspectTxValues = async ({
  addresses,
  tx,
  direction
}: {
  addresses: Wallet.KeyManagement.GroupedAddress[];
  tx: Wallet.Cardano.HydratedTx;
  direction: TxDirection;
}): Promise<Wallet.Cardano.Value> => {
  const paymentAddresses = addresses.map((addr) => addr.address);

  const targetAddresses =
    direction === TxDirections.Outgoing
      ? tx.body.outputs.filter((item) => !paymentAddresses.includes(item.address)).map((item) => item.address)
      : paymentAddresses;

  const inspectionProperties = await createTxInspector({
    totalOutputsValue: totalAddressOutputsValueInspector(targetAddresses)
  })(tx);

  return inspectionProperties.totalOutputsValue;
};

export enum CredentialType {
  KeyHash = 'KeyHash',
  ScriptHash = 'ScriptHash'
}

export const getCredentialType = (credentialType: Wallet.Cardano.CredentialType): CredentialType => {
  switch (credentialType) {
    case Wallet.Cardano.CredentialType.KeyHash:
      return CredentialType.KeyHash;
    case Wallet.Cardano.CredentialType.ScriptHash:
      return CredentialType.ScriptHash;
    default:
      return CredentialType.ScriptHash;
  }
};
