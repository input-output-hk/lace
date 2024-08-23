/* eslint-disable unicorn/no-null */
import React, { useEffect } from 'react';

import { ChevronUpIcon } from '@chakra-ui/icons';
import { Box, IconButton } from '@chakra-ui/react';

import { POPUP, POPUP_WINDOW, TAB } from '../config/config';

import { Scrollbars } from './app/components/scrollbar';
import { Store as StoreProvider } from './store';
import { Theme } from './theme';

import 'focus-visible/dist/focus-visible';
import './app/components/styles.css';
import type { Wallet } from '@lace/cardano';

const isMain = window.document.querySelector(`#${POPUP.main}`);
const isTab = window.document.querySelector(`#${TAB.hw}`);

export const Container = ({
  children,
  environmentName,
}: Readonly<{
  children: React.ReactNode;
  environmentName: Wallet.ChainName;
}>) => {
  const [scroll, setScroll] = React.useState({ el: null, y: 0 });

  useEffect(() => {
    window.document.body.addEventListener('keydown', e => {
      e.key === 'Escape' && e.preventDefault();
    });
    // Windows is somehow not opening the popup with the right size. Dynamically changing it, fixes it for now:
    if (navigator.userAgent.includes('Win') && !isMain && !isTab) {
      const width =
        POPUP_WINDOW.width + (window.outerWidth - window.innerWidth);
      const height =
        POPUP_WINDOW.height + (window.outerHeight - window.innerHeight);
      window.resizeTo(width, height);
    }
  }, []);

  return (
    <Box
      width={isMain ? `${POPUP_WINDOW.width}px` : '100%'}
      height={isMain ? `${POPUP_WINDOW.height}px` : '100vh'}
    >
      <Theme>
        <StoreProvider environmentName={environmentName}>
          <Scrollbars
            id="scroll"
            style={{ width: '100vw', height: '100vh' }}
            autoHide
            onScroll={e => {
              setScroll({ el: e.target, y: e.target.scrollTop });
            }}
          >
            {children}
            {scroll.y > 1200 && (
              <IconButton
                onClick={() => {
                  scroll.el.scrollTo({ behavior: 'smooth', top: 0 });
                }}
                position="fixed"
                bottom="15px"
                right="15px"
                size="sm"
                rounded="xl"
                colorScheme="teal"
                opacity={0.85}
                icon={<ChevronUpIcon />}
              />
            )}
          </Scrollbars>
        </StoreProvider>
      </Theme>
    </Box>
  );
};
