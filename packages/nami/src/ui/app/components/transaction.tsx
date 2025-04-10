/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/no-null */
import React, { useMemo } from 'react';

import { ExternalLinkIcon } from '@chakra-ui/icons';
import {
  Button,
  Box,
  Link,
  Text,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  VStack,
  Icon,
  useColorModeValue,
  Skeleton,
} from '@chakra-ui/react';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import ReactDOMServer from 'react-dom/server';
import {
  FaPiggyBank,
  FaTrashAlt,
  FaRegEdit,
  FaUserCheck,
  FaUsers,
  FaRegFileCode,
} from 'react-icons/fa';

import { IoRemoveCircleSharp } from 'react-icons/io5';
import { GenIcon } from 'react-icons/lib';
import {
  TiArrowForward,
  TiArrowBack,
  TiArrowShuffle,
  TiArrowLoop,
} from 'react-icons/ti';
import ReactTimeAgo from 'react-time-ago';

import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';

import AssetsPopover from './assetPopoverDiff';
import UnitDisplay from './unitDisplay';

import type { Extra, TxInfo, Type } from '../../../adapters/transactions';
import type { CommonOutsideHandlesContextValue } from 'features/common-outside-handles-provider';
import type { OutsideHandlesContextValue } from 'features/outside-handles-provider';
import type { TransactionDetail } from 'types';
import { logger as commonLogger } from '@lace/common';
import { contextLogger } from '@cardano-sdk/util';

TimeAgo.addDefaultLocale(en);

// extracted from `react-icons/gi` as react-icons does not support tree-shaking
// and the whole library is imported and exceeds Mozilla's 4MB file limit
const GiAnvilImpact = () =>
  GenIcon({
    tag: 'svg',
    attr: { viewBox: '0 0 512 512' },
    child: [
      {
        tag: 'path',
        attr: {
          d: 'M413.375 69.906L336.937 191.47l-8.25-32.69-30.218 88.97 62.655-29.375.22 29.438 127.03-50.938-70.813-1.97 47.782-68.686-73.47 39.25 21.5-95.564zM210.22 102.094l-32 14.406 16.874 55.656-177.813 80.03 12.564 27.876L207.656 200l30.406 49.47 49.313-22.19-21.344-70.343-55.81-54.843zM197.593 266.78v20.345h-88.906c15.994 38.807 51.225 65.43 88.906 74.28v32.97h58.562c-12.118 30.528-33.505 55.684-58.47 77.594H172.22v18.686H456.56V471.97h-27.406c-28.734-21.895-50.055-47.018-61.625-77.595h63.658v-29.188c19.748-6.995 39.5-19.51 59.25-36.687-19.812-17.523-39.23-27.25-59.25-31.938v-29.78H197.594z',
        },
        child: [],
      },
    ],
  })({});

const txTypeColor = {
  self: 'gray.500',
  internalIn: 'teal.500',
  externalIn: 'teal.500',
  internalOut: 'orange.500',
  externalOut: 'orange.500',
  withdrawal: 'yellow.400',
  delegation: 'purple.500',
  stake: 'cyan.700',
  unstake: 'red.400',
  poolUpdate: 'green.400',
  poolRetire: 'red.400',
  mint: 'cyan.500',
  multisig: 'pink.400',
  contract: 'teal.400',
};

const txTypeLabel = {
  withdrawal: 'Withdrawal',
  delegation: 'Delegation',
  stake: 'Stake Registration',
  unstake: 'Stake Deregistration',
  poolUpdate: 'Pool Update',
  poolRetire: 'Pool Retire',
  mint: 'Minting',
  multisig: 'Multi-signatures',
  contract: 'Contract',
};

interface TransactionProps {
  tx: TxInfo | undefined;
  network: OutsideHandlesContextValue['environmentName'];
  cardanoCoin: CommonOutsideHandlesContextValue['cardanoCoin'];
  openExternalLink: OutsideHandlesContextValue['openExternalLink'];
}

const Transaction = ({
  tx,
  network,
  cardanoCoin,
  openExternalLink,
}: Readonly<TransactionProps>) => {
  const colorMode = {
    iconBg: useColorModeValue('white', 'gray.800'),
    txBg: useColorModeValue('teal.50', 'gray.700'),
    txBgHover: useColorModeValue('teal.100', 'gray.600'),
    assetsBtnHover: useColorModeValue('teal.200', 'gray.700'),
  };

  const extraInfo = useMemo(
    () =>
      tx && tx.extra.length > 0 ? (
        <Text fontSize={12} fontWeight="semibold" color="teal.500">
          {getTxExtra(tx.extra)}
        </Text>
      ) : (
        ''
      ),
    [tx],
  );

  return (
    <AccordionItem borderTop="none" _last={{ borderBottom: 'none' }}>
      <VStack spacing={2}>
        {tx ? (
          <Box align="center" fontSize={14} fontWeight={500} color="gray.500">
            <ReactTimeAgo
              date={tx.date}
              locale="en-US"
              timeStyle="round-minute"
            />
          </Box>
        ) : (
          <Skeleton width="34%" height="22px" rounded="md" />
        )}
        {tx ? (
          <AccordionButton
            data-testid={`transaction-button-${tx.txHash}`}
            display="flex"
            wordBreak="break-word"
            justifyContent="space-between"
            bg={colorMode.txBg}
            borderRadius={10}
            borderLeftRadius={30}
            p={0}
            _hover={{ backgroundColor: colorMode.txBgHover }}
            _focus={{ border: 'none' }}
          >
            <Box
              display="flex"
              flexShrink={5}
              p={5}
              borderRadius={50}
              bg={colorMode.iconBg}
              position="relative"
              left="-15px"
            >
              <TxIcon txType={tx.type} extra={tx.extra} />
            </Box>
            <Box
              display="flex"
              flexDirection="column"
              textAlign="center"
              position="relative"
              left="-15px"
            >
              {tx.lovelace ? (
                <UnitDisplay
                  fontSize={18}
                  color={
                    tx.lovelace >= 0
                      ? txTypeColor.externalIn
                      : txTypeColor.externalOut
                  }
                  quantity={tx.lovelace}
                  decimals={6}
                  symbol={cardanoCoin.symbol}
                />
              ) : (
                extraInfo
              )}
              {['internalIn', 'externalIn'].includes(tx.type) ? (
                ''
              ) : (
                <Box flexDirection="row" fontSize={12}>
                  Fee:{' '}
                  <UnitDisplay
                    display="inline-block"
                    quantity={tx.fees}
                    decimals={6}
                    symbol={cardanoCoin.symbol}
                  />
                  {!!Number.parseInt(tx.deposit) && (
                    <>
                      {' & Deposit: '}
                      <UnitDisplay
                        display="inline-block"
                        quantity={tx.deposit}
                        decimals={6}
                        symbol={cardanoCoin.symbol}
                      />
                    </>
                  )}
                  {!!Number.parseInt(tx.refund) && (
                    <>
                      {' & Refund: '}
                      <UnitDisplay
                        display="inline-block"
                        quantity={tx.refund}
                        decimals={6}
                        symbol={cardanoCoin.symbol}
                      />
                    </>
                  )}
                </Box>
              )}

              {tx.assets.length > 0 ? (
                <Box flexDirection="row" fontSize={12}>
                  <Text
                    display="inline-block"
                    fontWeight="bold"
                    _hover={{ backgroundColor: colorMode.assetsBtnHover }}
                    borderRadius="md"
                  >
                    <AssetsPopover assets={tx.assets} isDifference />
                  </Text>
                </Box>
              ) : (
                ''
              )}
            </Box>
            <AccordionIcon color="teal.400" mr={5} fontSize={20} />
          </AccordionButton>
        ) : (
          <Skeleton width="100%" height="72px" rounded="md" />
        )}
        <AccordionPanel wordBreak="break-word" pb={4}>
          {tx && (
            <TxDetail
              openExternalLink={openExternalLink}
              tx={tx}
              network={network}
            />
          )}
        </AccordionPanel>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Box
            _before={{ content: '" "' }}
            w={5}
            h={5}
            mb={1}
            borderColor="teal.400"
            borderWidth={5}
            borderRadius={50}
          ></Box>
          <Box
            _before={{ content: '" "' }}
            w={1}
            h={8}
            bg="orange.500"
            mb={2}
          ></Box>
        </Box>
      </VStack>
    </AccordionItem>
  );
};

const TxIcon = ({
  txType,
  extra,
}: Readonly<{ txType: Type; extra: Extra[] }>) => {
  const icons = {
    self: TiArrowLoop,
    internalIn: TiArrowShuffle,
    externalIn: TiArrowForward,
    internalOut: TiArrowShuffle,
    externalOut: TiArrowBack,
    delegation: FaPiggyBank,
    stake: FaUserCheck,
    unstake: IoRemoveCircleSharp,
    poolUpdate: FaRegEdit,
    poolRetire: FaTrashAlt,
    mint: GiAnvilImpact,
    multisig: FaUsers,
    contract: FaRegFileCode,
  };

  // there is no withdrawal type of tx in lace (see LW-11844)
  const filteredExtra = extra.filter(e => e !== 'withdrawal');
  const type = filteredExtra.length > 0 ? filteredExtra[0] : txType;

  let style;
  switch (type) {
    case 'externalIn': {
      style = { transform: 'rotate(90deg)' };
      break;
    }
    case 'internalOut': {
      style = { transform: 'rotate(180deg)' };
      break;
    }
    default: {
      style = {};
    }
  }

  return (
    <Icon
      as={icons[type]}
      style={style}
      w={8}
      h={8}
      color={txTypeColor[type]}
    />
  );
};

const getExplorerUrl = (
  network: OutsideHandlesContextValue['environmentName'],
): never | string => {
  switch (network) {
    case 'Mainnet': {
      return 'https://cardanoscan.io/transaction/';
    }
    case 'Preprod': {
      return 'https://preprod.cardanoscan.io/transaction/';
    }
    case 'Preview': {
      return 'https://preview.cexplorer.io/tx/';
    }
    case 'Sanchonet': {
      // eslint-disable-next-line functional/no-throw-statements
      throw new Error('Not implemented yet: "Sanchonet" case');
    }
  }
};

interface TxDetailProps {
  tx: TxInfo;
  network: OutsideHandlesContextValue['environmentName'];
  openExternalLink: OutsideHandlesContextValue['openExternalLink'];
}

const TxDetail = ({
  tx,
  network,
  openExternalLink,
}: Readonly<TxDetailProps>) => {
  const capture = useCaptureEvent();
  const logger = contextLogger(commonLogger, 'Nami:TxDetail');
  const colorMode = {
    extraDetail: useColorModeValue('black', 'white'),
  };

  return (
    <>
      <Box display="flex" flexDirection="row">
        <Box>
          <Box
            display="flex"
            flexDirection="column"
            color="gray.600"
            fontSize="sm"
            fontWeight="bold"
          >
            Transaction ID
          </Box>
          <Box>
            <Link
              color="teal"
              isExternal
              onClick={() => {
                void (async () => {
                  await capture(
                    Events.ActivityActivityDetailTransactionHashClick,
                  );
                  try {
                    openExternalLink(`${getExplorerUrl(network)}${tx.txHash}`);
                  } catch {
                    logger.warn('Cannot open cardano explorer URL');
                  }
                })();
              }}
            >
              {tx.txHash} <ExternalLinkIcon mx="2px" />
            </Link>
            {tx.metadata.length > 0 ? (
              <Button
                display="inline-block"
                colorScheme="orange"
                size="xs"
                fontSize="10px"
                p="2px 4px"
                height="revert"
                m="0 5px"
                onClick={() => {
                  viewMetadata(tx.metadata);
                }}
              >
                See Metadata
              </Button>
            ) : (
              ''
            )}
          </Box>
        </Box>
        <Box>
          <Box
            display="flex"
            flexDirection="column"
            textAlign="right"
            pl="10px"
            color="gray.500"
            fontSize="xs"
            fontWeight="400"
            minWidth="75px"
          >
            {tx.timestamp}
          </Box>
        </Box>
      </Box>
      {tx.extra.length > 0 ? (
        <Box display="flex" flexDirection="column" mt="10px">
          <Box>
            <Box color="gray.600" fontSize="sm" fontWeight="bold">
              Transaction Extra
            </Box>
            <Box>
              <Text
                fontSize={12}
                fontWeight="semibold"
                color={colorMode.extraDetail}
              >
                {getTxExtra(tx.extra)}
              </Text>
            </Box>
          </Box>
        </Box>
      ) : (
        ''
      )}
    </>
  );
};

const viewMetadata = (
  metadata: Readonly<TransactionDetail['metadata']>,
): void => {
  const HighlightJson = () => (
    <html lang="en">
      <head>
        <title>Metadata</title>
      </head>
      <body style={{ backgroundColor: '#2b2b2b' }}>
        <pre
          style={{
            padding: '8px',
            color: '#f8f8f2',
            fontSize: '14px',
            lineHeight: '20px',
          }}
        >
          <code>
            {JSON.stringify(
              metadata.map(m => ({ [m.label]: m.json_metadata })),
              null,
              2,
            )}
          </code>
        </pre>
      </body>
    </html>
  );
  const newTab = window.open();
  newTab?.document.write(ReactDOMServer.renderToString(<HighlightJson />));
  newTab?.document.close();
};

const getTxExtra = (extra: readonly Extra[]): string[] =>
  // eslint-disable-next-line max-params
  extra.map((item, index, array) =>
    index < array.length - 1 ? txTypeLabel[item] + ', ' : txTypeLabel[item],
  );

export default Transaction;
