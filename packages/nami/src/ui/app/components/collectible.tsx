/* eslint-disable @typescript-eslint/naming-convention */
import React from 'react';

import {
  Box,
  Avatar,
  Image,
  Skeleton,
  useColorModeValue,
} from '@chakra-ui/react';

import './styles.css';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';

const useIsMounted = () => {
  const isMounted = React.useRef(false);
  React.useEffect((): (() => void) => {
    isMounted.current = true;
    return () => (isMounted.current = false);
  }, []);
  return isMounted;
};

const lineClampStyle = {
  display: '-webkit-box',
  '-webkit-line-clamp': '3',
  '-webkit-box-orient': 'vertical',
};

const CollectibleComponent = ({ asset, ...props }, ref) => {
  const capture = useCaptureEvent();
  const background = useColorModeValue('gray.300', 'white');
  const [showInfo, setShowInfo] = React.useState(false);

  return (
    <Box
      onClick={() => {
        capture(Events.NFTsImageClick);
        asset && ref.current?.openModal(asset);
      }}
      position="relative"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      width="160px"
      height="160px"
      overflow="hidden"
      rounded="3xl"
      background={background}
      border="solid 1px"
      borderColor={background}
      onMouseEnter={() => {
        setShowInfo(true);
      }}
      onMouseLeave={() => {
        setShowInfo(false);
      }}
      cursor="pointer"
      userSelect="none"
      data-testid={props.testId}
    >
      <Box
        filter={(showInfo && 'brightness(0.6)') || undefined}
        width="180%"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {asset ? (
          <Image
            width="full"
            rounded="sm"
            src={asset.image}
            fallback={
              asset.image ? (
                <Fallback name={asset.name} />
              ) : (
                <Avatar width="210px" height="210px" name={asset.name} />
              )
            }
          />
        ) : (
          <Skeleton width="210px" height="210px" />
        )}
      </Box>
      {asset && (
        <Box
          width="full"
          position="absolute"
          bottom={0}
          left={0}
          style={{
            transition: '0.2s',
            bottom: showInfo ? '130px' : '0',
          }}
        >
          <Box
            position="absolute"
            width="full"
            height="130px"
            background="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
            color="black"
          >
            <Box
              overflow="hidden"
              style={lineClampStyle}
              fontSize={13}
              fontWeight="bold"
              color="GrayText"
              textAlign="center"
              width="80%"
            >
              {asset.name}
            </Box>
            <Box
              color="gray.600"
              fontWeight="semibold"
              position="absolute"
              left="15px"
              bottom="10px"
            >
              x {asset.quantity}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const Collectible = React.forwardRef(CollectibleComponent);

Collectible.displayName = 'Collectible';

const Fallback = ({ name }: Readonly<{ name?: string }>) => {
  const [timedOut, setTimedOut] = React.useState(false);
  const isMounted = useIsMounted();
  React.useEffect(() => {
    setTimeout(() => {
      isMounted.current && setTimedOut(true);
    }, 30_000);
  }, []);
  if (timedOut) return <Avatar width="210px" height="210px" name={name} />;
  return <Skeleton width="210px" height="210px" />;
};

export default Collectible;
