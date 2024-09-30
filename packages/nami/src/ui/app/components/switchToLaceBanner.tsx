import React from 'react';

import { Box, Image, Text, useColorModeValue } from '@chakra-ui/react';
import { Button as LaceButton } from '@lace/common';
import { motion } from 'framer-motion';

import LaceLogo from '../../../assets/img/lace.svg';
import laceGradientBackground from '../../../assets/img/laceGradientBackground.png';
import laceVideoBackground from '../../../assets/video/laceVideoBackground.mp4';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useStoreActions, useStoreState } from '../../store';

import LaceSecondaryButton from './laceSecondaryButton';

export const getLaceVideoBackgroundSrc = () => {
  return typeof chrome !== 'undefined' &&
    chrome.runtime &&
    chrome.runtime?.getURL
    ? chrome.runtime.getURL('laceVideoBackground.mp4')
    : laceVideoBackground;
};

interface Props {
  switchWalletMode: () => Promise<void>;
}

export const SwitchToLaceBanner = ({ switchWalletMode }: Props) => {
  const [isLaceSwitchInProgress, setIsLaceSwitchInProgress] = [
    useStoreState(
      state => state.globalModel.laceSwitchStore.isLaceSwitchInProgress,
    ),
    useStoreActions(
      actions => actions.globalModel.laceSwitchStore.setIsLaceSwitchInProgress,
    ),
  ];
  const capture = useCaptureEvent();

  const backgroundColor = useColorModeValue('white', 'blackAlpha.900');
  const textColor = useColorModeValue('gray.900', 'white');

  const handleSwitchWalletMode = async () => {
    await switchWalletMode();
    setIsLaceSwitchInProgress(false);
    void capture(Events.SwitchToLaceModeBannerActivateLaceButtonClick);
  };

  const laceVideoBackgroundSrc = getLaceVideoBackgroundSrc();

  return (
    <>
      {!isLaceSwitchInProgress && (
        <motion.div style={{ position: 'relative', width: '100vw' }}>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            gridGap="4px"
            height="30px"
            cursor="pointer"
            backgroundColor={backgroundColor}
            onClick={() => {
              setIsLaceSwitchInProgress(true);
              void capture(Events.SwitchToLaceModeBannerClick);
            }}
          >
            <Image draggable={false} src={LaceLogo} />
            <Text fontSize="medium" color={textColor}>
              Upgrade to Lace
            </Text>
          </Box>
        </motion.div>
      )}
      {isLaceSwitchInProgress && (
        <motion.div
          key="splashScreen"
          initial={{
            y: -600,
            height: '600px',
          }}
          animate={{
            y: 0,
          }}
          transition={{
            y: { duration: 0.5, ease: 'easeInOut' },
          }}
        >
          <Box
            position="absolute"
            zIndex="100"
            height="100vh"
            width="100%"
            sx={{
              backgroundImage: `url(${laceGradientBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <>
              <motion.video
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                }}
                transition={{
                  delay: 2.5,
                  duration: 1,
                  ease: 'easeIn',
                }}
                autoPlay
                loop
                muted
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: -1,
                }}
                src={laceVideoBackgroundSrc}
              />
              <motion.div
                layout
                initial={{
                  bottom: '-500px',
                  opacity: 0,
                }}
                animate={{
                  bottom: ['-500px', '-250px', '-250px', '0px'], // Move to the middle, pause, then to the top
                  opacity: [0, 1, 1, 1],
                }}
                transition={{
                  delay: 0.5,
                  times: [0, 0.2, 0.6, 0.85],
                  duration: 2.8,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  justifyContent: 'space-between',
                  alignContent: 'center',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  height: '100%',
                  padding: '24px 34px 34px 34px',
                }}
              >
                <div>
                  <Text
                    fontSize="2xl"
                    bgGradient="linear(to-r, rgba(255,146,222,1) 0%, rgba(253,195,0,1) 50%)"
                    bgClip="text"
                    fontWeight="extrabold"
                  >
                    Your Nami wallet evolved!
                  </Text>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      delay: 2.5,
                      duration: 1,
                    }}
                  >
                    <Text fontSize="md" mt="3" color="gray.900">
                      Enable Lace Mode to unlock access to new and exciting Web
                      3 features
                    </Text>
                    <Text mt="3" fontSize="sm" color="gray.600">
                      You can return to the "Nami Mode" at any time
                    </Text>
                  </motion.div>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                  }}
                  transition={{
                    delay: 2.7,
                    duration: 0.4,
                    ease: 'easeInOut',
                  }}
                  style={{
                    width: '100%',
                    gap: 8,
                    flexDirection: 'column',
                    display: 'flex',
                  }}
                >
                  <Box
                    position="absolute"
                    bottom="0"
                    left="0"
                    width="100%"
                    height="150px"
                    bgGradient="linear(180deg, transparent, rgba(255, 255, 255, 0.9) 50%)"
                  />
                  <LaceButton onClick={handleSwitchWalletMode} block>
                    Activate Lace Mode
                  </LaceButton>
                  <LaceSecondaryButton
                    onClick={() => {
                      setIsLaceSwitchInProgress(false);
                      void capture(
                        Events.SwitchToLaceModeBannerMaybeLaterButtonClick,
                      );
                    }}
                  >
                    Maybe later
                  </LaceSecondaryButton>
                </motion.div>
              </motion.div>
            </>
          </Box>
        </motion.div>
      )}
    </>
  );
};
