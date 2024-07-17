import {
  Box,
  Copy as CopyIcon,
  Flex,
  Key as KeyIcon,
  LaceLogoComponent as LaceLogo,
  Text,
  UploadComponent as UploadIcon,
  UserGroupGradientComponent as UserGroupIcon,
  sx,
} from '@input-output-hk/lace-ui-toolkit';
import { toast } from '@lace/common';
import React, { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styles from './SharedWalletEntry.module.scss';
import { SharedWalletEntryOption } from './SharedWalletEntryOption';

const TOAST_DURATION = 3;

export type SharedWalletEntrySharedProps = {
  onCreateSharedWalletClick: () => void;
  onImportSharedWalletClick: () => void;
  onKeysGenerateClick: () => void;
};

type SharedWalletEntryProps = SharedWalletEntrySharedProps &
  (
    | {
        createAndImportOptionsDisabled: true;
        sharedWalletKeyMode: 'generate';
      }
    | {
        createAndImportOptionsDisabled: false;
        onKeysCopyClick: () => Promise<void>;
        sharedWalletKeyMode: 'copy';
      }
  );

export const SharedWalletEntry = ({
  createAndImportOptionsDisabled,
  onCreateSharedWalletClick,
  onImportSharedWalletClick,
  onKeysGenerateClick,
  ...restProps
}: SharedWalletEntryProps): React.ReactElement => {
  const { t } = useTranslation();

  const commonKeysOptionCopies = useMemo(
    () => ({
      description: (
        <Trans i18nKey="sharedWallets.addSharedWallet.getStarted.keyOption.description" components={{ br: <br /> }} />
      ),
      title: t('sharedWallets.addSharedWallet.getStarted.keyOption.title'),
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
      keyCopyOption: {
        ...commonKeysOptionCopies,
        button: t('sharedWallets.addSharedWallet.getStarted.keyOption.button.copy'),
      },
      keyCopyToastText: t('sharedWallets.addSharedWallet.getStarted.keyOption.copyToast'),
      keyGenerateOption: {
        ...commonKeysOptionCopies,
        button: t('sharedWallets.addSharedWallet.getStarted.keyOption.button.generate'),
      },
      subTitle: t('sharedWallets.addSharedWallet.getStarted.subTitle'),
      title: t('sharedWallets.addSharedWallet.getStarted.title'),
    }),
    [t, commonKeysOptionCopies],
  );

  const onKeysCopyClick = async () => {
    if (restProps.sharedWalletKeyMode !== 'copy') return;
    await restProps.onKeysCopyClick();
    toast.notify({
      duration: TOAST_DURATION,
      icon: CopyIcon,
      text: translations.keyCopyToastText,
    });
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
          {restProps.sharedWalletKeyMode === 'generate' && (
            <SharedWalletEntryOption
              copies={translations.keyGenerateOption}
              Icon={KeyIcon}
              onClick={onKeysGenerateClick}
              testId="shared-wallet-generate"
            />
          )}
          {restProps.sharedWalletKeyMode === 'copy' && (
            <SharedWalletEntryOption
              copies={translations.keyCopyOption}
              Icon={KeyIcon}
              onClick={onKeysCopyClick}
              testId="shared-wallet-copy"
            />
          )}
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
