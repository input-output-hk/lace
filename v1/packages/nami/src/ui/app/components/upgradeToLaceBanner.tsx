import React from 'react';

import { Box, Button, Text, Link, useColorModeValue } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';

import { useOutsideHandles } from '../../../features/outside-handles-provider';

export const UpgradeToLaceBanner = ({
  showSwitchToLaceBanner,
}: Readonly<{ showSwitchToLaceBanner: boolean }>) => {
  const warningBackground = useColorModeValue('#fcf5e3', '#fcf5e3');
  const { openExternalLink, switchWalletMode, redirectToStaking } =
    useOutsideHandles();

  return (
    <AnimatePresence>
      {showSwitchToLaceBanner && (
        <motion.div
          key="splashScreen"
          initial={{
            y: '-224px',
            height: '0px',
            marginBottom: 0,
          }}
          animate={{
            y: '0px',
            height: '224px',
            marginBottom: '1.25rem',
          }}
          transition={{
            all: { duration: 5, ease: 'easeInOut' },
          }}
          exit={{
            y: '-224px',
            height: '0px',
            marginBottom: 0,
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="flex-end"
            flexDirection="column"
            background={warningBackground}
            rounded="xl"
            padding="18"
            gridGap="8px"
            mb="4"
            overflow="hidden"
          >
            <Text
              color="gray.800"
              fontSize="14"
              fontWeight="500"
              lineHeight="24px"
            >
              Your ADA balance includes Locked Stake Rewards that can only be
              withdrawn or transacted after registering your voting power.
              Upgrade to Lace to continue. For more information, visit our{' '}
              <Link
                isExternal
                textDecoration="underline"
                onClick={() => {
                  openExternalLink('https://www.lace.io/faq');
                }}
              >
                FAQs.
              </Link>
            </Text>
            <Button
              height="36px"
              width="100%"
              colorScheme="teal"
              onClick={async () => {
                redirectToStaking();
                await switchWalletMode();
              }}
            >
              Upgrade to Lace
            </Button>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
