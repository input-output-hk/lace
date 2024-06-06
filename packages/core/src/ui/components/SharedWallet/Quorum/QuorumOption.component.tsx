/* eslint-disable unicorn/no-null */
import { Box, Card, Flex, RadioButtonGroup, Select, Text } from '@lace/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SharedWalletLayout, SharedWalletTimelineSteps } from '../SharedWalletLayout/SharedWalletLayout';

const minimumTotalCosignersForEnablingDropdown = 3;

export enum QuorumRadioOption {
  AllAddresses = 'AllAddresses',
  SomeAddress = 'SomeAddress'
}

export type QuorumOptionValue =
  | {
      option: QuorumRadioOption.AllAddresses;
    }
  | {
      option: QuorumRadioOption.SomeAddress;
      numberOfCosigner: number;
    };

export interface QuorumOptionProps {
  onBack: () => void;
  onChange: (selection: QuorumOptionValue) => void;
  onNext: () => void;
  totalCosignersNumber: number;
  value: QuorumOptionValue;
}

export const QuorumOption = ({
  onBack,
  onChange,
  onNext,
  totalCosignersNumber,
  value
}: QuorumOptionProps): JSX.Element => {
  const { t } = useTranslation();

  const translations = {
    title: t('core.sharedWallet.quorum.title'),
    description: t('core.sharedWallet.quorum.description'),
    buttonBack: t('core.sharedWallet.quorum.buttonBack'),
    buttonNext: t('core.sharedWallet.quorum.buttonNext'),
    optionAll: t('core.sharedWallet.quorum.optionAll'),
    optionSome: t('core.sharedWallet.quorum.optionSome'),
    cosignersAmountPickerText: t('core.sharedWallet.quorum.cosignersAmountPickerText', {
      amount: totalCosignersNumber
    })
  };

  const cosignersNumberPickerOptions = Array.from({ length: totalCosignersNumber - 1 }, (_, index) =>
    String(index + 1)
  );

  const onOptionChange = (option: QuorumRadioOption) => {
    if (option === QuorumRadioOption.AllAddresses) {
      onChange({ option: QuorumRadioOption.AllAddresses });
      return;
    }

    const numberOfCosigner = value.option === option ? value.numberOfCosigner : 1;
    onChange({
      option: QuorumRadioOption.SomeAddress,
      numberOfCosigner
    });
  };

  const onNumberOfCosignerChange = (num: string) => {
    onChange({
      option: QuorumRadioOption.SomeAddress,
      numberOfCosigner: Number(num)
    });
  };

  return (
    <SharedWalletLayout
      title={translations.title}
      description={translations.description}
      onNext={onNext}
      onBack={onBack}
      currentTimelineStep={SharedWalletTimelineSteps.DEFINE_QUORUM}
    >
      <Flex gap="$16" flexDirection="column" alignItems="stretch">
        <RadioButtonGroup
          options={[
            {
              value: QuorumRadioOption.AllAddresses,
              label: translations.optionAll,
              // eslint-disable-next-line react/no-multi-comp
              render: ({ optionElement }) => (
                <Box mb={'$16'}>
                  <Card.Outlined data-testid={`setup-quorum-user-option-${QuorumRadioOption.AllAddresses}`}>
                    <Flex p={'$16'}>{optionElement}</Flex>
                  </Card.Outlined>
                </Box>
              )
            },
            {
              value: QuorumRadioOption.SomeAddress,
              label: translations.optionSome,
              // eslint-disable-next-line react/no-multi-comp
              render: ({ optionElement }) => (
                <Card.Outlined data-testid={`setup-quorum-user-option-${QuorumRadioOption.SomeAddress}`}>
                  <Flex p={'$16'} flexDirection={'column'}>
                    <Box mb={'$10'}>{optionElement}</Box>
                    <Flex
                      pl="$40"
                      w="$fill"
                      justifyContent="flex-start"
                      alignItems="center"
                      data-testid="setup-quorum-cosigner-container"
                      gap="$8"
                    >
                      <Select.Root
                        disabled={
                          value.option === QuorumRadioOption.AllAddresses ||
                          totalCosignersNumber < minimumTotalCosignersForEnablingDropdown
                        }
                        variant="outline"
                        placeholder="0"
                        value={value.option === QuorumRadioOption.SomeAddress ? String(value.numberOfCosigner) : '1'}
                        onChange={onNumberOfCosignerChange}
                        showArrow
                      >
                        {cosignersNumberPickerOptions.map((num) => (
                          <Select.Item key={num} value={num} title={num} />
                        ))}
                      </Select.Root>
                      <Text.Body.Small>{translations.cosignersAmountPickerText}</Text.Body.Small>
                    </Flex>
                  </Flex>
                </Card.Outlined>
              )
            }
          ]}
          onValueChange={onOptionChange}
          selectedValue={value.option}
        />
      </Flex>
    </SharedWalletLayout>
  );
};
