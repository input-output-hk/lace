import { convertLovelacesToAda } from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import {
  Accordion,
  Column,
  spacing,
  Text,
  truncateText,
} from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAddressTag } from '../../utils/address-utils';

import { ActivityDetailItem } from './ActivityDetailItem';

import type { TxOutputInput } from '@lace-contract/cardano-context';

export const ActivityDetailsInputOutput = ({
  inputOutput,
  label = 'Outputs',
  coinSymbol = 'ADA',
  ownAddresses = [],
}: {
  inputOutput?: TxOutputInput[];
  label?: 'Inputs' | 'Outputs';
  coinSymbol?: string;
  ownAddresses?: string[];
}) => {
  const { t } = useTranslation();
  const { renderAddressTag } = useAddressTag(ownAddresses);

  if (!inputOutput || inputOutput.length === 0) return null;

  return (
    <Accordion.Root title={label}>
      {inputOutput.map((input, index) => (
        <Accordion.AccordionContent key={index}>
          <Column gap={spacing.M}>
            <ActivityDetailItem
              label={t('v2.activity-details.sheet.address')}
              value={
                <Column gap={spacing.S} alignItems="flex-end">
                  <Text.M>{truncateText(input.addr)}</Text.M>
                  {renderAddressTag(input.addr)}
                </Column>
              }
            />
            <ActivityDetailItem
              shouldShowDivider={index !== inputOutput.length - 1}
              label={t('v2.activity-details.sheet.amount')}
              value={
                <Column alignItems="flex-end">
                  <Text.M>
                    {convertLovelacesToAda(input.amount)}
                    {` ${coinSymbol}`}
                  </Text.M>
                  {input.assetList &&
                    input.assetList.length > 0 &&
                    input.assetList.map((asset, index) => (
                      <Text.M key={`${asset.name}-${index}`}>
                        {asset.amount} {asset.name}
                      </Text.M>
                    ))}
                </Column>
              }
            />
          </Column>
        </Accordion.AccordionContent>
      ))}
    </Accordion.Root>
  );
};
