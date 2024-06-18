import { ReactComponent as LaceLogo } from '@lace/icons/dist/LaceLogoComponent';
import { ReactComponent as UploadIcon } from '@lace/icons/dist/UploadComponent';
import { ReactComponent as UserGroupIcon } from '@lace/icons/dist/UserGroupGradientComponent';
import { Box, Flex, Text, sx } from '@lace/ui';
import React from 'react';
import styles from './SharedWalletGetStartedDialog.module.scss';
import { SharedWalletSetupOption } from './SharedWalletGetStartedOption.component';

export type SharedWalletSetupOptionTranslations = Record<'title' | 'description' | 'button', string>;

export interface SetupSharedWalletProps {
  onCreateSharedWalletClick?: () => void;
  onImportSharedWalletClick?: () => void;
  translations: {
    createSharedWalletOption: SharedWalletSetupOptionTranslations;
    importSharedWalletOption: SharedWalletSetupOptionTranslations;
    subTitle: string;
    title: string;
  };
}

export const SharedWalletGetStartedOptions = ({
  onCreateSharedWalletClick,
  onImportSharedWalletClick,
  translations,
}: SetupSharedWalletProps): React.ReactElement => (
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
        <SharedWalletSetupOption
          copies={translations.createSharedWalletOption}
          Icon={UserGroupIcon}
          onClick={onCreateSharedWalletClick}
          testId="shared-wallet-new"
        />
        <div className={styles.separator} />
        <SharedWalletSetupOption
          copies={translations.importSharedWalletOption}
          Icon={UploadIcon}
          onClick={onImportSharedWalletClick}
          testId="shared-wallet-import"
        />
      </div>
    </Flex>
  </div>
);
