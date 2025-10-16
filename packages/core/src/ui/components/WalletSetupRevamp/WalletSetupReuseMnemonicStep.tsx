import React, { ReactElement, useEffect, useState } from 'react';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';
import { WalletTimelineSteps } from '@ui/components/WalletSetup';
import { Box, Flex, Select, Text } from '@input-output-hk/lace-ui-toolkit';
import { AnyWallet } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';

type WalletSetupReuseMnemonicStepProps = {
  wallets: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[];
  setWalletToReuse: React.Dispatch<
    React.SetStateAction<AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata> | undefined>
  >;
  onBack: () => void;
  onNext: () => void;
};

export const WalletSetupReuseMnemonicStep = ({
  wallets = [],
  setWalletToReuse,
  onNext,
  onBack
}: WalletSetupReuseMnemonicStepProps): ReactElement => {
  const [selectedWallet, setSelectedWallet] = useState<string | undefined>(wallets[0]?.walletId);
  const { t } = useTranslation();

  useEffect(() => {
    setSelectedWallet(wallets[0]?.walletId);
    setWalletToReuse(wallets[0]);
  }, [setWalletToReuse, wallets]);

  const handleOnChange = (value: string) => {
    setSelectedWallet(value);
    const wallet = wallets.find((w) => w.walletId === value);
    setWalletToReuse(wallet);
  };

  return (
    <WalletSetupStepLayoutRevamp
      title={t('core.walletSetupReuseRecoveryPhrase.title')}
      description={t('core.walletSetupReuseRecoveryPhrase.description')}
      onBack={onBack}
      onNext={onNext}
      nextLabel={t('core.walletSetupReuseRecoveryPhrase.useSameRecoveryPhrase')}
      backLabel={t('core.walletSetupReuseRecoveryPhrase.createNewOne')}
      isNextEnabled={!!selectedWallet}
      currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
    >
      <Flex flexDirection="column" mt="$52" gap="$16" w="$fill">
        <Text.Body.Normal>{t('core.walletSetupReuseRecoveryPhrase.selectWallet')}</Text.Body.Normal>
        <Box w="$fill">
          <Select.Root
            variant="outline"
            placeholder="Wallets"
            value={selectedWallet}
            triggerTestId="wallet-setup-select-input"
            onChange={handleOnChange}
            showArrow
            zIndex={1000}
            fullWidth
          >
            {wallets.map(({ walletId, metadata }) => (
              <Select.Item key={walletId} value={walletId} title={metadata.name} />
            ))}
          </Select.Root>
        </Box>
      </Flex>
    </WalletSetupStepLayoutRevamp>
  );
};
