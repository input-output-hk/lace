/* eslint-disable react/no-multi-comp */
import React, { useMemo } from 'react';

import { ChevronDownIcon } from '@chakra-ui/icons';
import { Box, Text, Spinner, Accordion, Button } from '@chakra-ui/react';
import { File } from 'react-kawaii';

import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useOutsideHandles } from '../../../features/outside-handles-provider/useOutsideHandles';

import Transaction from './transaction';

import type { Wallet } from '@lace/cardano';

const BATCH = 5;

const HistoryViewer = () => {
  const capture = useCaptureEvent();
  const { cardanoCoin, transactions, environmentName, openExternalLink } =
    useOutsideHandles();
  const [historySlice, setHistorySlice] = React.useState<
    Wallet.Cardano.HydratedTx[] | undefined
  >();
  const [page, setPage] = React.useState(1);
  const [isFinal, setIsFinal] = React.useState(false);

  const getTxs = () => {
    if (!transactions) return;
    const slice = (historySlice ?? []).concat(
      transactions.slice((page - 1) * BATCH, page * BATCH),
    );
    if (slice.length < page * BATCH) setIsFinal(true);
    setHistorySlice(slice);
  };

  React.useEffect(() => {
    getTxs();
  }, [page]);

  const history = useMemo(
    () =>
      historySlice && historySlice.length <= 0 ? (
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
            {historySlice?.map(tx => (
              <Transaction
                key={tx.id.toString()}
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
                  setTimeout(() => {
                    setPage(page + 1);
                  });
                }}
                colorScheme="orange"
                aria-label="More"
                fontSize={20}
                w="50%"
                h="30px"
                rounded="xl"
              >
                <ChevronDownIcon fontSize="30px" />
              </Button>
            </Box>
          )}
        </>
      ),
    [historySlice, setPage, openExternalLink, capture],
  );

  return (
    <Box position="relative">{historySlice ? history : <HistorySpinner />}</Box>
  );
};

const HistorySpinner = () => (
  <Box mt="28" display="flex" alignItems="center" justifyContent="center">
    <Spinner color="teal" speed="0.5s" />
  </Box>
);

export default HistoryViewer;
