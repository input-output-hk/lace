/* eslint-disable unicorn/no-null */
import React from 'react';

import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

import { SwitchToLaceBanner } from './app/components/switchToLaceBanner';

export const UpgradeToLaceHeader = ({
  switchWalletMode,
}: {
  switchWalletMode: () => Promise<void>;
}) => {
  const location = useLocation();

  if (location.pathname.startsWith('/hwTab')) return null;

  return (
    <motion.div
      initial={{ marginTop: -30 }}
      animate={{ marginTop: 0 }}
      transition={{ duration: 0.3 }}
    >
      <SwitchToLaceBanner switchWalletMode={switchWalletMode} />
    </motion.div>
  );
};
