import React, { useMemo } from 'react';
import { Grid, Divider, sx, Text, Metadata, Cell } from '@input-output-hk/lace-ui-toolkit';
import * as Types from './TreasuryWithdrawalsActionTypes';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';
import { ActionId } from '../components/ActionId';
import { Procedure } from '../components/Procedure';
import { useTranslation } from 'react-i18next';

interface TreasuryWithdrawalsActionProps {
  data: Types.Data;
}

export const TreasuryWithdrawalsAction = ({
  data: { txDetails, procedure, withdrawals, actionId }
}: TreasuryWithdrawalsActionProps): JSX.Element => {
  const { t } = useTranslation();

  const textCss = sx({
    color: '$text_primary'
  });

  const translations = useMemo<Types.Translations>(
    () => ({
      txDetails: {
        title: t('core.ProposalProcedure.txDetails.title'),
        txType: t('core.ProposalProcedure.txDetails.txType'),
        deposit: t('core.ProposalProcedure.txDetails.deposit'),
        rewardAccount: t('core.ProposalProcedure.txDetails.rewardAccount')
      },
      procedure: {
        title: t('core.ProposalProcedure.procedure.title'),
        anchor: {
          url: t('core.ProposalProcedure.procedure.anchor.url'),
          hash: t('core.ProposalProcedure.procedure.anchor.hash')
        }
      },
      actionId: {
        title: t('core.ProposalProcedure.governanceAction.actionId.title'),
        index: t('core.ProposalProcedure.governanceAction.actionId.index'),
        txId: t('core.ProposalProcedure.governanceAction.actionId.txId')
      },
      withdrawals: {
        title: t('core.ProposalProcedure.governanceAction.treasuryWithdrawals.title'),
        rewardAccount: t('core.ProposalProcedure.governanceAction.treasuryWithdrawals.withdrawals.rewardAccount'),
        lovelace: t('core.ProposalProcedure.governanceAction.treasuryWithdrawals.withdrawals.lovelace')
      }
    }),
    [t]
  );

  return (
    <Grid columns="$1" gutters="$20">
      {/* tx details section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t('core.ProposalProcedure.governanceAction.treasuryWithdrawals.title')}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      <Cell>
        <Text.Body.Large className={textCss} weight="$bold">
          {translations.withdrawals.title}
        </Text.Body.Large>
      </Cell>
      {withdrawals.map((withdrawal) => (
        <React.Fragment key={`${withdrawal.rewardAccount}${withdrawal.lovelace}`}>
          <Cell>
            <Metadata label={translations.withdrawals.rewardAccount} text={withdrawal.rewardAccount} />
          </Cell>
          <Cell>
            <Metadata label={translations.withdrawals.lovelace} text={withdrawal.lovelace} />
          </Cell>
        </React.Fragment>
      ))}
      {actionId && (
        <>
          <Cell>
            <Divider my={'$16'} />
          </Cell>
          <ActionId translations={translations.actionId} data={actionId} />
        </>
      )}
    </Grid>
  );
};
