/* eslint-disable react/no-multi-comp */
import React, { useEffect, useMemo, useState } from 'react';

import { ChevronDownIcon } from '@chakra-ui/icons';
import { Box, Text, Spinner, Accordion, Button } from '@chakra-ui/react';
import { File } from 'react-kawaii';

import { useWalletTxs } from '../../../adapters/transactions';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useCommonOutsideHandles } from '../../../features/common-outside-handles-provider';
import { useOutsideHandles } from '../../../features/outside-handles-provider/useOutsideHandles';

import Transaction from './transaction';

const HistoryViewer = () => {
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const capture = useCaptureEvent();
  const { environmentName, openExternalLink, txHistoryLoader } = useOutsideHandles();
  const { cardanoCoin } = useCommonOutsideHandles();
  const { txs: transactions, isFinal } = useWalletTxs();

  useEffect(() => setIsLoadingNext(false), [transactions?.length, isFinal])

  const history = useMemo(
    () =>
      transactions && transactions.length <= 0 ? (
        <Box
          mt="16"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          opacity="0.5"
        >
          <File size={80} mood="ko" color="#61DDBC" />
          <Box height="2" />
          <Text fontWeight="bold" color="GrayText">
            No History
          </Text>
        </Box>
      ) : (
        <>
          <Accordion
            allowToggle
            borderBottom="none"
            onClick={() => {
              void capture(Events.ActivityActivityActivityRowClick);
            }}
          >
            {transactions?.map((tx, key) => (
              <MemoizedTransaction
                key={tx?.txHash.toString() ?? key}
                tx={tx}
                network={environmentName}
                cardanoCoin={cardanoCoin}
                openExternalLink={openExternalLink}
              />
            ))}
          </Accordion>
          {isFinal ? (
            <Box
              textAlign="center"
              fontSize={16}
              fontWeight="bold"
              color="gray.400"
            >
              ... nothing more
            </Box>
          ) : (
            <Box textAlign="center">
              <Button
                variant="outline"
                onClick={() => {
                  setIsLoadingNext(true);
                  txHistoryLoader.loadMore();
                }}
                colorScheme="orange"
                aria-label="More"
                fontSize={20}
                w="50%"
                h="30px"
                rounded="xl"
                disabled={isLoadingNext}
              >
                {isLoadingNext ? '...' : <ChevronDownIcon fontSize="30px" />}
              </Button>
            </Box>
          )}
        </>
      ),
    [transactions, openExternalLink, isLoadingNext],
  );

  return (
    <Box position="relative">{transactions ? history : <HistorySpinner />}</Box>
  );
};

const HistorySpinner = () => (
  <Box mt="28" display="flex" alignItems="center" justifyContent="center">
    <Spinner color="teal" speed="0.5s" />
  </Box>
);

const MemoizedTransaction = React.memo(Transaction);

export default React.memo(HistoryViewer);
