import React, { useEffect, useState } from 'react';
import { DappInfo, VotingProcedures } from '@lace/core';
import { votingProceduresInspector } from './utils';
import { useCexplorerBaseUrl, useDisallowSignTx } from './hooks';
import { Wallet } from '@lace/cardano';

import { NonRegisteredUserModal } from './NonRegisteredUserModal/NonRegisteredUserModal';
import { useViewsFlowContext } from '@providers';
import { useWalletStore } from '@src/stores';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';

export const VotingProceduresContainer = (): React.ReactElement => {
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const { inMemoryWallet } = useWalletStore();
  const [votingProcedures, setVotingProcedures] = useState<Wallet.Cardano.VotingProcedures>([]);
  const [isNonRegisteredUserModalVisible, setIsNonRegisteredUserModalVisible] = useState<boolean>(false);
  const [userAckNonRegisteredState, setUserAckNonRegisteredState] = useState<boolean>(false);
  const disallowSignTx = useDisallowSignTx(request);

  useEffect(() => {
    const getVotingProcedures = async () => {
      const txVotingProcedures = await votingProceduresInspector(request.transaction.toCore());
      setVotingProcedures(txVotingProcedures);
    };

    getVotingProcedures();
  }, [request]);

  useEffect(() => {
    if (userAckNonRegisteredState) return () => void 0;
    const subscription = inMemoryWallet?.governance?.isRegisteredAsDRep$?.subscribe(
      (hasValidDrepRegistration): void => {
        setIsNonRegisteredUserModalVisible(!hasValidDrepRegistration);
      }
    );

    return () => subscription?.unsubscribe();
  }, [inMemoryWallet?.governance?.isRegisteredAsDRep$, userAckNonRegisteredState]);

  const explorerBaseUrl = useCexplorerBaseUrl();

  return (
    <>
      <NonRegisteredUserModal
        visible={isNonRegisteredUserModalVisible}
        onConfirm={() => {
          setUserAckNonRegisteredState(true);
          setIsNonRegisteredUserModalVisible(false);
        }}
        onClose={() => disallowSignTx(true)}
      />
      <Flex h="$fill" flexDirection="column">
        <Box mb={'$28'} mt={'$32'}>
          <DappInfo {...dappInfo} />
        </Box>
        <VotingProcedures
          data={votingProcedures.map((votingProcedure) =>
            Wallet.util.mapVotingProcedureToView(votingProcedure, explorerBaseUrl)
          )}
        />
      </Flex>
    </>
  );
};
