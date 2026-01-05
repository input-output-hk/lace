import React, { ReactElement, useEffect, useState } from 'react';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';
import { WalletTimelineSteps } from '@ui/components/WalletSetup';
import { Box, Flex, Select, Text, TextLink } from '@input-output-hk/lace-ui-toolkit';
import { AnyWallet } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';

type CardanoWallet = AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
export type WalletWithMnemonic = CardanoWallet | Wallet.LmpBundleWallet;

const getWalletName = (wallet: WalletWithMnemonic): string =>
  'metadata' in wallet ? wallet.metadata.name : wallet.walletName;

type WalletSetupReuseMnemonicStepProps = {
  wallets: WalletWithMnemonic[];
  setWalletToReuse: React.Dispatch<React.SetStateAction<WalletWithMnemonic | undefined>>;
  onSkip: () => void;
  onReuse: () => void;
  onBack?: () => void;
};

export const WalletSetupReuseMnemonicStep = ({
  wallets = [],
  setWalletToReuse,
  onReuse,
  onSkip,
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
      onNext={onReuse}
      nextLabel={t('core.walletSetupReuseRecoveryPhrase.reuse')}
      isNextEnabled={!!selectedWallet}
      currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
      customAction={
        <TextLink
          label={t('core.walletSetupReuseRecoveryPhrase.skip')}
          onClick={onSkip}
          testId="wallet-setup-step-btn-skip"
        />
      }
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
            {wallets.map((wallet) => (
              <Select.Item key={wallet.walletId} value={wallet.walletId} title={getWalletName(wallet)} />
            ))}
          </Select.Root>
        </Box>
      </Flex>
    </WalletSetupStepLayoutRevamp>
  );
};
