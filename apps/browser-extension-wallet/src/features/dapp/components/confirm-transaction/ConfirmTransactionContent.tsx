/* eslint-disable unicorn/no-null */
import React, { useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRegistrationContainer } from './ConfirmDRepRegistrationContainer';
import { DappTransactionContainer } from './DappTransactionContainer';
import { ConfirmDRepRetirementContainer } from './ConfirmDRepRetirementContainer';
import { ConfirmVoteDelegationContainer } from './ConfirmVoteDelegationContainer';
import { VotingProceduresContainer } from './VotingProceduresContainer';
import { ConfirmDRepUpdateContainer } from './ConfirmDRepUpdateContainer';
import { ConfirmVoteRegistrationDelegationContainer } from './ConfirmVoteRegistrationDelegationContainer';
import { ConfirmStakeRegistrationDelegationContainer } from './ConfirmStakeRegistrationDelegationContainer';
import { ConfirmStakeVoteRegistrationDelegationContainer } from './ConfirmStakeVoteRegistrationDelegationContainer';
import { ConfirmStakeVoteDelegationContainer } from './ConfirmStakeVoteDelegationContainer';
import { ProposalProceduresContainer } from './ProposalProceduresContainer';
import styles from './ConfirmTransaction.module.scss';

interface Props {
  txTypes: Wallet.Cip30TxType[];
  tx: Wallet.Cardano.Tx<Wallet.Cardano.TxBody>;
  onError?: () => void;
}

export const ConfirmTransactionContent = ({ tx, txTypes, onError }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const containerPerTypeMap: Record<
    Wallet.Cip30TxType,
    (props: { onError?: () => void; tx: Wallet.Cardano.Tx<Wallet.Cardano.TxBody> }) => React.ReactElement
  > = useMemo(
    () => ({
      [Wallet.Cip30TxType.DRepRegistration]: ConfirmDRepRegistrationContainer,
      [Wallet.Cip30TxType.DRepRetirement]: ConfirmDRepRetirementContainer,
      [Wallet.Cip30TxType.DRepUpdate]: ConfirmDRepUpdateContainer,
      [Wallet.Cip30TxType.VoteDelegation]: ConfirmVoteDelegationContainer,
      [Wallet.Cip30TxType.VotingProcedures]: VotingProceduresContainer,
      [Wallet.Cip30TxType.VoteRegistrationDelegation]: ConfirmVoteRegistrationDelegationContainer,
      [Wallet.Cip30TxType.StakeRegistrationDelegation]: ConfirmStakeRegistrationDelegationContainer,
      [Wallet.Cip30TxType.StakeVoteDelegationRegistration]: ConfirmStakeVoteRegistrationDelegationContainer,
      [Wallet.Cip30TxType.StakeVoteDelegation]: ConfirmStakeVoteDelegationContainer,
      [Wallet.Cip30TxType.ProposalProcedures]: ProposalProceduresContainer,
      Send: undefined,
      Mint: undefined,
      Burn: undefined
    }),
    []
  );

  return (
    <>
      {txTypes.length > 0 ? (
        txTypes.map((type) => {
          const Container = containerPerTypeMap[type] || null;
          return (
            Container && (
              <>
                <div className={styles.title}>{t('core.${type}.title')}</div>
                <Container tx={tx} key={type} {...(type === Wallet.Cip30TxType.DRepRetirement && { onError })} />
              </>
            )
          );
        })
      ) : (
        <>
          <div className={styles.title}>{t('core.${type}.title')}</div>
          <DappTransactionContainer tx={tx} />
        </>
      )}
    </>
  );
};
