import React from 'react';

import { motion } from 'framer-motion';

import { SwitchToLaceBanner } from './app/components/switchToLaceBanner';

export const UpgradeToLaceHeader = ({
  switchWalletMode,
}: {
  switchWalletMode: () => Promise<void>;
}) => {
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
