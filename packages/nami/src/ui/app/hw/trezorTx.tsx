import React from 'react';
import type { ReactElement } from 'react';

import { Serialization } from '@cardano-sdk/core';
import { isNotNil } from '@cardano-sdk/util';
import { Box, Image, useColorModeValue, useToast } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { firstValueFrom } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import { getCollateralUtxo } from '../../../adapters/collateral';
import { submitTx } from '../../../api/extension';
import LogoOriginal from '../../../assets/img/logo.svg';
import LogoWhite from '../../../assets/img/logoWhite.svg';
import { useCommonOutsideHandles } from '../../../features/common-outside-handles-provider';

export const TrezorTx = (): ReactElement => {
  const backgroundColor = useColorModeValue('gray.200', 'gray.800');
  const Logo = useColorModeValue(LogoOriginal, LogoWhite);
  const { cbor, setCollateral } = useParams<{
    cbor: string;
    setCollateral?: string;
  }>();

  const toast = useToast();
  const { inMemoryWallet, withSignTxConfirmation } = useCommonOutsideHandles();

  React.useEffect(() => {
    withSignTxConfirmation(async () => {
      try {
        const serializableTx = Serialization.Transaction.fromCbor(
          cbor as unknown as Serialization.TxCBOR,
        );
        const signedTx = await inMemoryWallet.finalizeTx({
          tx: cbor as unknown as Serialization.TxCBOR,
        });
        const witness = serializableTx.witnessSet();
        witness.setVkeys(
          Serialization.CborSet.fromCore(
            [...signedTx.witness.signatures.entries()],
            Serialization.VkeyWitness.fromCore,
          ),
        );
        serializableTx.setWitnessSet(witness);

        const txId = await submitTx(serializableTx.toCbor(), inMemoryWallet);

        if (txId) {
          if (setCollateral) {
            const utxo = await getCollateralUtxo(txId, inMemoryWallet);
            await inMemoryWallet.utxo.setUnspendable([utxo]);
          }

          toast({
            title: 'Transaction submitted',
            status: 'success',
            duration: 3000,
          });
        } else {
          toast({
            title: 'Transaction failed',
            status: 'error',
            duration: 3000,
          });
        }
      } catch (error) {
        console.error(error);
        toast({
          title: 'Transaction failed',
          status: 'error',
          duration: 3000,
        });
      }

      setTimeout(() => {
        window.close();
      }, 3000);
    }, '');
  }, []);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="100vw"
      height="100vh"
      position="relative"
      background={backgroundColor}
    >
      <Box position="absolute" left="40px" top="40px">
        <Image draggable={false} src={Logo} width="36px" />
      </Box>
      <Box
        display="flex"
        alignItems="center"
        flexDirection="column"
        fontSize="lg"
      >
        Waiting for Trezor...
      </Box>
    </Box>
  );
};
