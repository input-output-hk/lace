import React from 'react';
import { renderLabel, renderSentAssets, RowContainer } from './OutputSummaryUtils';
import styles from './OutputSummary.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { Text, Flex, Box } from '@lace/ui';
import { getAddressTagTranslations, renderAddressTag } from '@src/ui/utils';
import { useTranslate } from '@src/ui/hooks';

export type SentAssetsList = Array<{
  assetAmount: string;
  fiatAmount: string;
}>;

export interface OutputSummaryProps {
  list: SentAssetsList;
  recipientAddress: string;
  recipientName?: string;
  translations?: TranslationsFor<'recipientAddress' | 'sending'>;
  ownAddresses?: string[];
}

export const OutputSummary = ({
  list,
  recipientAddress,
  translations,
  recipientName,
  ownAddresses
}: OutputSummaryProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <div className={styles.container} data-testid="output-summary-container">
      <RowContainer data-testid="output-summary-row">
        {renderLabel({ label: translations.sending, dataTestId: 'output-summary-sending-title' })}
        <div className={styles.assetList} data-testid="output-summary-asset-list">
          {renderSentAssets(list)}
        </div>
      </RowContainer>

      <RowContainer>
        {renderLabel({ label: translations.recipientAddress, dataTestId: 'output-summary-recipient-title' })}
        <Flex className={styles.recipient} flexDirection="column">
          {recipientName && (
            <Box mb="$4" w="$fill">
              <Text.Body.Normal weight="$semibold" data-testid="output-summary-recipient-name">
                {recipientName}
              </Text.Body.Normal>
            </Box>
          )}

          <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$8">
            <Text.Address
              color={recipientName ? 'secondary' : 'primary'}
              className={styles.address}
              data-testid="output-summary-recipient-address"
            >
              {recipientAddress}
            </Text.Address>
            {renderAddressTag({
              address: recipientAddress,
              translations: getAddressTagTranslations(t),
              ownAddresses
            })}
          </Flex>
        </Flex>
      </RowContainer>
    </div>
  );
};
