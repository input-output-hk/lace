/* eslint-disable @typescript-eslint/naming-convention */
import type { PropsWithChildren } from 'react';
import React from 'react';

import {
  Box,
  Avatar,
  Image,
  Skeleton,
  useColorModeValue,
  Button,
  Collapse,
} from '@chakra-ui/react';
import { BsArrowUpRight } from 'react-icons/bs';
import { useHistory } from 'react-router-dom';

import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useStoreActions, useStoreState } from '../../store';

import Copy from './copy';
import UnitDisplay from './unitDisplay';

import type { CommonOutsideHandlesContextValue } from '../../../features/common-outside-handles-provider';
import type { Asset as NamiAsset } from '../../../types/assets';

const useIsMounted = () => {
  const isMounted = React.useRef(false);
  React.useEffect((): (() => void) => {
    isMounted.current = true;
    return () => (isMounted.current = false);
  }, []);
  return isMounted;
};

type Props = Pick<CommonOutsideHandlesContextValue, 'cardanoCoin'> &
  PropsWithChildren<{
    asset: NamiAsset;
    enableSend?: boolean;
    background?: string;
    color?: string;
  }>;

const Asset = ({
  asset,
  enableSend,
  cardanoCoin,
  ...props
}: Readonly<Props>) => {
  const capture = useCaptureEvent();
  const background = useColorModeValue('gray.100', 'gray.700');
  const color = useColorModeValue('rgb(26, 32, 44)', 'inherit');
  const [show, setShow] = React.useState(false);
  const [value, setValue] = [
    useStoreState(state => state.globalModel.sendStore.value),
    useStoreActions(actions => actions.globalModel.sendStore.setValue),
  ];
  const history = useHistory();
  const navigate = history.push;

  const displayName = asset.unit === 'lovelace' ? 'Ada' : asset.displayName;
  const decimals = asset.unit === 'lovelace' ? 6 : asset.decimals;

  const onShowDetails = () => {
    if (asset.unit === 'lovelace') return;
    setShow(!show);
  };

  return (
    <Box
      data-testid="asset"
      display="flex"
      alignItems="center"
      width="90%"
      rounded="xl"
      background={background}
      color={color}
      onClick={onShowDetails}
      cursor="pointer"
      overflow="hidden"
    >
      <Collapse startingHeight={60} in={show} style={{ width: '100%' }}>
        <Box
          width="100%"
          height="60px"
          display="flex"
          alignItems="center"
          px={4}
        >
          <Box width="44px" height="44px" rounded="full" overflow="hidden">
            <Image
              draggable={false}
              width="full"
              src={asset.image}
              fallback={
                asset.image ? (
                  <Fallback name={asset.name} />
                ) : asset.unit === 'lovelace' ? (
                  <Box
                    width={'full'}
                    height={'full'}
                    background={'blue.500'}
                    color={'white'}
                    display={'flex'}
                    alignItems={'center'}
                    justifyContent={'center'}
                    fontSize={'xl'}
                    fontWeight={'normal'}
                  >
                    {cardanoCoin.symbol}
                  </Box>
                ) : (
                  <Avatar
                    fontWeight={'normal'}
                    width="full"
                    height="full"
                    name={asset.name}
                  />
                )
              }
            />
          </Box>

          <Box w={4} />
          <Box
            width="90px"
            className="lineClamp"
            fontWeight="bold"
            overflow="hidden"
            fontSize={12}
          >
            {displayName}
          </Box>
          <Box w={4} />
          <Box
            width="120px"
            textAlign="center"
            py={1}
            background={props.background}
            color={props.color}
            rounded={'xl'}
            fontSize={12}
          >
            <UnitDisplay quantity={asset.quantity} decimals={decimals ?? 0} />
          </Box>
        </Box>
        <Box h={4} />
        <Box px={10} display="flex" width="full" wordBreak="break-all">
          <Box width="140px" fontWeight="bold" fontSize={12}>
            Policy
          </Box>
          <Box
            fontSize={10}
            width="340px"
            onClick={e => {
              e.stopPropagation();
            }}
          >
            <Copy label="Copied policy" copy={asset.policy}>
              {asset.policy}
            </Copy>
          </Box>
        </Box>
        <Box h={4} />
        <Box px={10} display="flex" width="full" wordBreak="break-all">
          <Box width="140px" fontWeight="bold" fontSize={12}>
            Asset
          </Box>
          <Box
            fontSize={10}
            width="340px"
            onClick={e => {
              e.stopPropagation();
            }}
          >
            <Copy label="Copied asset" copy={asset.fingerprint}>
              {asset.fingerprint}
            </Copy>
          </Box>
        </Box>

        <Box h={2} />
        {enableSend && (
          <Box width="full" display="flex" justifyContent="right">
            <Button
              mr="4"
              background={background == 'gray.100' ? 'gray.200' : 'gray.600'}
              size="xs"
              rightIcon={<BsArrowUpRight />}
              onClick={e => {
                setValue({ ...value, assets: [{ ...asset, input: '' }] });
                capture(Events.SendClick);
                navigate('/send');
              }}
            >
              Send
            </Button>
          </Box>
        )}
        <Box h={2} />
      </Collapse>
    </Box>
  );
};

const Fallback = ({ name }: Readonly<{ name?: string }>) => {
  const [timedOut, setTimedOut] = React.useState(false);
  const isMounted = useIsMounted();
  React.useEffect(() => {
    setTimeout(() => {
      isMounted.current && setTimedOut(true);
    }, 30_000);
  }, []);
  if (timedOut) return <Avatar name={name} />;
  return <Skeleton width="full" height="full" />;
};

export default Asset;
