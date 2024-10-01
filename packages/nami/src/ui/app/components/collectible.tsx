import {
  Box,
  Avatar,
  Image,
  Skeleton,
  useColorModeValue,
} from '@chakra-ui/react';
import React from 'react';
import './styles.css';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { Events } from '../../../features/analytics/events';

const useIsMounted = () => {
  const isMounted = React.useRef(false);
  React.useEffect(() => {
    isMounted.current = true;
    return () => (isMounted.current = false);
  }, []);
  return isMounted;
};

const Collectible = React.forwardRef(({ asset, ...props }, ref) => {
  const capture = useCaptureEvent();
  const background = useColorModeValue('gray.300', 'white');
  const [showInfo, setShowInfo] = React.useState(false);

  return (
      <Box
        onClick={() => {
          capture(Events.NFTsImageClick);
          asset && ref.current.openModal(asset);
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
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
        cursor="pointer"
        userSelect="none"
        data-testid={props.testId}
      >
        <Box
          filter={showInfo && 'brightness(0.6)'}
          width="180%"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {!asset ? (
            <Skeleton width="210px" height="210px" />
          ) : (
            <Image
              width="full"
              rounded="sm"
              src={asset.image}
              fallback={
                !asset.image ? (
                  <Avatar width="210px" height="210px" name={asset.name} />
                ) : (
                  <Fallback name={asset.name} />
                )
              }
            />
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
                className="lineClamp3"
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
});

const Fallback = ({ name }) => {
  const [timedOut, setTimedOut] = React.useState(false);
  const isMounted = useIsMounted();
  React.useEffect(() => {
    setTimeout(() => isMounted.current && setTimedOut(true), 30000);
  }, []);
  if (timedOut) return <Avatar width="210px" height="210px" name={name} />;
  return <Skeleton width="210px" height="210px" />;
};

export default Collectible;
