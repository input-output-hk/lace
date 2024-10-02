/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/no-null */
import React from 'react';

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
  FaCoins,
  FaPiggyBank,
  FaTrashAlt,
  FaRegEdit,
  FaUserCheck,
  FaUsers,
  FaRegFileCode,
} from 'react-icons/fa';
import { GiAnvilImpact } from 'react-icons/gi';
import { IoRemoveCircleSharp } from 'react-icons/io5';
import {
  TiArrowForward,
  TiArrowBack,
  TiArrowShuffle,
  TiArrowLoop,
} from 'react-icons/ti';
import ReactTimeAgo from 'react-time-ago';

import { useTxInfo } from '../../../adapters/transactions';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';

import AssetsPopover from './assetPopoverDiff';
import UnitDisplay from './unitDisplay';

import type { Extra, TxInfo, Type } from '../../../adapters/transactions';
import type { Wallet } from '@lace/cardano';
import type { OutsideHandlesContextValue } from 'features/outside-handles-provider';
import type { TransactionDetail } from 'types';

TimeAgo.addDefaultLocale(en);

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
  tx: Wallet.Cardano.HydratedTx;
  network: OutsideHandlesContextValue['environmentName'];
  cardanoCoin: OutsideHandlesContextValue['cardanoCoin'];
  openExternalLink: OutsideHandlesContextValue['openExternalLink'];
}

const Transaction = ({
  tx,
  network,
  cardanoCoin,
  openExternalLink,
}: Readonly<TransactionProps>) => {
  const displayInfo = useTxInfo(tx);
  const colorMode = {
    iconBg: useColorModeValue('white', 'gray.800'),
    txBg: useColorModeValue('teal.50', 'gray.700'),
    txBgHover: useColorModeValue('teal.100', 'gray.600'),
    assetsBtnHover: useColorModeValue('teal.200', 'gray.700'),
  };

  return (
    <AccordionItem borderTop="none" _last={{ borderBottom: 'none' }}>
      <VStack spacing={2}>
        {displayInfo ? (
          <Box align="center" fontSize={14} fontWeight={500} color="gray.500">
            <ReactTimeAgo
              date={displayInfo.date}
              title={displayInfo.formatDate}
              locale="en-US"
              timeStyle="round-minute"
            />
          </Box>
        ) : (
          <Skeleton width="34%" height="22px" rounded="md" />
        )}
        {displayInfo ? (
          <AccordionButton
            data-testid={`transaction-button-${displayInfo.txHash}`}
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
              <TxIcon txType={displayInfo.type} extra={displayInfo.extra} />
            </Box>
            <Box
              display="flex"
              flexDirection="column"
              textAlign="center"
              position="relative"
              left="-15px"
            >
              {displayInfo.lovelace ? (
                <UnitDisplay
                  fontSize={18}
                  color={
                    displayInfo.lovelace >= 0
                      ? txTypeColor.externalIn
                      : txTypeColor.externalOut
                  }
                  quantity={displayInfo.lovelace}
                  decimals={6}
                  symbol={cardanoCoin.symbol}
                />
              ) : displayInfo.extra.length > 0 ? (
                <Text fontSize={12} fontWeight="semibold" color="teal.500">
                  {getTxExtra(displayInfo.extra)}
                </Text>
              ) : (
                ''
              )}
              {['internalIn', 'externalIn'].includes(displayInfo.type) ? (
                ''
              ) : (
                <Box flexDirection="row" fontSize={12}>
                  Fee:{' '}
                  <UnitDisplay
                    display="inline-block"
                    quantity={displayInfo.fees}
                    decimals={6}
                    symbol={cardanoCoin.symbol}
                  />
                  {!!Number.parseInt(displayInfo.deposit) && (
                    <>
                      {' & Deposit: '}
                      <UnitDisplay
                        display="inline-block"
                        quantity={displayInfo.deposit}
                        decimals={6}
                        symbol={cardanoCoin.symbol}
                      />
                    </>
                  )}
                  {!!Number.parseInt(displayInfo.refund) && (
                    <>
                      {' & Refund: '}
                      <UnitDisplay
                        display="inline-block"
                        quantity={displayInfo.refund}
                        decimals={6}
                        symbol={cardanoCoin.symbol}
                      />
                    </>
                  )}
                </Box>
              )}

              {displayInfo.assets.length > 0 ? (
                <Box flexDirection="row" fontSize={12}>
                  <Text
                    display="inline-block"
                    fontWeight="bold"
                    _hover={{ backgroundColor: colorMode.assetsBtnHover }}
                    borderRadius="md"
                  >
                    <AssetsPopover assets={displayInfo.assets} isDifference />
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
          {displayInfo && (
            <TxDetail
              openExternalLink={openExternalLink}
              displayInfo={displayInfo}
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
    withdrawal: FaCoins,
    delegation: FaPiggyBank,
    stake: FaUserCheck,
    unstake: IoRemoveCircleSharp,
    poolUpdate: FaRegEdit,
    poolRetire: FaTrashAlt,
    mint: GiAnvilImpact,
    multisig: FaUsers,
    contract: FaRegFileCode,
  };

  const type = extra.length > 0 ? extra[0] : txType;

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
  displayInfo: TxInfo;
  network: OutsideHandlesContextValue['environmentName'];
  openExternalLink: OutsideHandlesContextValue['openExternalLink'];
}

const TxDetail = ({
  displayInfo,
  network,
  openExternalLink,
}: Readonly<TxDetailProps>) => {
  const capture = useCaptureEvent();
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
                    openExternalLink(
                      `${getExplorerUrl(network)}${displayInfo.txHash}`,
                    );
                  } catch {
                    console.error('cannot open an external url');
                  }
                })();
              }}
            >
              {displayInfo.txHash} <ExternalLinkIcon mx="2px" />
            </Link>
            {displayInfo.metadata.length > 0 ? (
              <Button
                display="inline-block"
                colorScheme="orange"
                size="xs"
                fontSize="10px"
                p="2px 4px"
                height="revert"
                m="0 5px"
                onClick={() => {
                  viewMetadata(displayInfo.metadata);
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
            {displayInfo.timestamp}
          </Box>
        </Box>
      </Box>
      {displayInfo.extra.length > 0 ? (
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
                {getTxExtra(displayInfo.extra)}
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
