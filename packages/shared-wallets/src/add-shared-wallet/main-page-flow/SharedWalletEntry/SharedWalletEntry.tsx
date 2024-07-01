import { toast } from '@lace/common';
import { ReactComponent as CopyIcon } from '@lace/icons/dist/Copy';
import { ReactComponent as KeyIcon } from '@lace/icons/dist/Key';
import { ReactComponent as LaceLogo } from '@lace/icons/dist/LaceLogoComponent';
import { ReactComponent as UploadIcon } from '@lace/icons/dist/UploadComponent';
import { ReactComponent as UserGroupIcon } from '@lace/icons/dist/UserGroupGradientComponent';
import { Box, Flex, Text, sx } from '@lace/ui';
import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styles from './SharedWalletEntry.module.scss';
import { SharedWalletEntryOption } from './SharedWalletEntryOption';

const TOAST_DURATION = 3;

export type SharedWalletEntryProps = {
  createAndImportOptionsDisabled: boolean; // Fixed type
  getSharedKeys: () => Promise<string>;
  onCreateSharedWalletClick: () => void;
  onImportSharedWalletClick: () => void;
};

export const SharedWalletEntry = ({
  createAndImportOptionsDisabled,
  getSharedKeys,
  onCreateSharedWalletClick,
  onImportSharedWalletClick,
}: SharedWalletEntryProps): React.ReactElement => {
  const { t } = useTranslation();

  const commonKeysOptionCopies = useMemo(
    () => ({
      description: (
        <Trans i18nKey="sharedWallets.addSharedWallet.getStarted.keysOption.description" components={{ br: <br /> }} />
      ),
      title: t('sharedWallets.addSharedWallet.getStarted.keysOption.title'),
    }),
    [t],
  );

  const translations = useMemo(
    () => ({
      createSharedWalletOption: {
        button: t('sharedWallets.addSharedWallet.getStarted.createSharedWalletOption.button'),
        description: (
          <Trans
            i18nKey="sharedWallets.addSharedWallet.getStarted.createSharedWalletOption.description"
            components={{ br: <br /> }}
          />
        ),
        title: t('sharedWallets.addSharedWallet.getStarted.createSharedWalletOption.title'),
      },
      importSharedWalletOption: {
        button: t('sharedWallets.addSharedWallet.getStarted.importSharedWalletOption.button'),
        description: (
          <Trans
            i18nKey="sharedWallets.addSharedWallet.getStarted.importSharedWalletOption.description"
            components={{ br: <br /> }}
          />
        ),
        title: t('sharedWallets.addSharedWallet.getStarted.importSharedWalletOption.title'),
      },
      keysCopyOption: {
        ...commonKeysOptionCopies,
        button: t('sharedWallets.addSharedWallet.getStarted.keysOption.button.copy'),
      },
      keysCopyToastText: t('sharedWallets.addSharedWallet.getStarted.keysOption.copyToast'),
      keysGenerateOption: {
        ...commonKeysOptionCopies,
        button: t('sharedWallets.addSharedWallet.getStarted.keysOption.button.generate'),
      },
      subTitle: t('sharedWallets.addSharedWallet.getStarted.subTitle'),
      title: t('sharedWallets.addSharedWallet.getStarted.title'),
    }),
    [t, commonKeysOptionCopies],
  );

  const [keys, setKeys] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedKeys = async () => {
      try {
        const sharedKeys = await getSharedKeys();
        setKeys(sharedKeys);
      } catch (error) {
        console.error('Failed to fetch shared keys:', error);
      }
    };

    fetchSharedKeys();
  }, [getSharedKeys]);

  const handleCopyClick = async () => {
    try {
      await getSharedKeys();
      toast.notify({
        duration: TOAST_DURATION,
        icon: CopyIcon,
        text: translations.keysCopyToastText,
      });
    } catch (error) {
      console.error('Failed to copy keys:', error);
    }
  };

  const getKeysModeComponent = (): JSX.Element => {
    if (keys) {
      return (
        <SharedWalletEntryOption
          copies={translations.keysCopyOption}
          Icon={KeyIcon}
          onClick={handleCopyClick}
          testId="shared-wallet-copy"
        />
      );
    }
    return (
      <SharedWalletEntryOption
        copies={translations.keysGenerateOption}
        Icon={KeyIcon}
        onClick={async () => {
          // eslint-disable-next-line no-console
          console.log('keys=>', keys);
        }}
        testId="shared-wallet-generate"
      />
    );
  };

  return (
    <div className={styles.root} data-testid="shared-wallet-setup-options-container">
      <Flex
        flexDirection="column"
        alignItems="center"
        justifyContent="space-between"
        data-testid="shared-wallet-setup-options-content"
      >
        <Flex
          mb="$48"
          flexDirection="column"
          alignItems="center"
          className={styles.header}
          data-testid="shared-wallet-setup-options-header"
        >
          <LaceLogo className={styles.image} data-testid="shared-wallet-setup-logo" />
          <Text.Heading
            className={sx({
              color: '$text_primary',
            })}
            data-testid="wallet-setup-title"
          >
            {translations.title}
          </Text.Heading>
          <Box mt="$8">
            <Text.Body.Normal
              className={sx({
                color: '$text_secondary',
              })}
              weight="$semibold"
              data-testid="shared-wallet-setup-subtitle"
            >
              {translations.subTitle}
            </Text.Body.Normal>
          </Box>
        </Flex>
        <div className={styles.options}>
          {getKeysModeComponent()}
          <div className={styles.separator} />
          <SharedWalletEntryOption
            copies={translations.createSharedWalletOption}
            Icon={UserGroupIcon}
            onClick={onCreateSharedWalletClick}
            testId="shared-wallet-new"
            disabled={createAndImportOptionsDisabled}
          />
          <div className={styles.separator} />
          <SharedWalletEntryOption
            copies={translations.importSharedWalletOption}
            Icon={UploadIcon}
            onClick={onImportSharedWalletClick}
            testId="shared-wallet-import"
            disabled={createAndImportOptionsDisabled}
          />
        </div>
      </Flex>
    </div>
  );
};
