import React from 'react';
import styles from './SetupSharedWallet.module.scss';
import { SharedWalletSetupOption } from './SharedWalletSetupOption.component';
import { ReactComponent as UserGroupIcon } from '../../../assets/icons/user-group-gradient.component.svg';
import { ReactComponent as UploadIcon } from '../../../assets/icons/upload.component.svg';
import { ReactComponent as LaceLogo } from '../../../assets/icons/lace-logo.component.svg';
import { Box, Flex, sx, Text } from '@lace/ui';

export type SharedWalletSetupOptionTranslations = Record<'title' | 'description' | 'button', string>;

export interface SetupSharedWalletProps {
  onCreateSharedWalletClick?: () => void;
  onImportSharedWalletClick?: () => void;
  translations: {
    title: string;
    subTitle: string;
    createSharedWalletOption: SharedWalletSetupOptionTranslations;
    importSharedWalletOption: SharedWalletSetupOptionTranslations;
  };
}

export const SetupSharedWallet = ({
  onCreateSharedWalletClick,
  onImportSharedWalletClick,
  translations
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
            color: '$text_primary'
          })}
          data-testid="wallet-setup-title"
        >
          {translations.title}
        </Text.Heading>
        <Box mt="$8">
          <Text.Body.Normal
            className={sx({
              color: '$text_secondary'
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
