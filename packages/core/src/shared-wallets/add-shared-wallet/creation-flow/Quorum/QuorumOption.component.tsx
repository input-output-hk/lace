import { Box, Card, Flex, RadioButtonGroup, Select, Text } from '@input-output-hk/lace-ui-toolkit';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SharedWalletLayout } from '../../SharedWalletLayout';
import { SharedWalletCreationStep } from '../state-and-types';
import { creationTimelineSteps } from '../timelineSteps';

const minimumTotalCosignersForEnablingDropdown = 3;

export enum QuorumRadioOption {
  AllAddresses = 'AllAddresses',
  Any = 'AnyAddress',
  NOfK = 'RequireNOf',
}

export type QuorumOptionValue =
  | {
      option: QuorumRadioOption.AllAddresses;
    }
  | {
      option: QuorumRadioOption.Any;
    }
  | {
      numberOfCosigner: number;
      option: QuorumRadioOption.NOfK;
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
  value,
}: QuorumOptionProps): JSX.Element => {
  const { t } = useTranslation();

  const translations = {
    buttonBack: t('sharedWallets.addSharedWallet.quorum.button.back'),
    buttonNext: t('sharedWallets.addSharedWallet.quorum.button.next'),
    cosignersAmountPickerText: t('sharedWallets.addSharedWallet.quorum.cosignersAmountPickerText', {
      amount: totalCosignersNumber,
    }),
    description: t('sharedWallets.addSharedWallet.quorum.description'),
    optionAll: t('sharedWallets.addSharedWallet.quorum.optionAll'),
    optionSome: t('sharedWallets.addSharedWallet.quorum.optionSome'),
    title: t('sharedWallets.addSharedWallet.quorum.title'),
  };

  const cosignersNumberPickerOptions = Array.from({ length: totalCosignersNumber - 1 }, (_, index) =>
    String(index + 1),
  );

  const onOptionChange = (option: QuorumRadioOption) => {
    if (option === QuorumRadioOption.AllAddresses) {
      onChange({ option: QuorumRadioOption.AllAddresses });
      return;
    }

    const numberOfCosigner = value.option === QuorumRadioOption.NOfK ? value?.numberOfCosigner : 1;
    onChange({
      numberOfCosigner,
      option: QuorumRadioOption.NOfK,
    });
  };

  const onNumberOfCosignerChange = (num: string) => {
    onChange({
      numberOfCosigner: Number(num),
      option: QuorumRadioOption.NOfK,
    });
  };

  return (
    <SharedWalletLayout
      title={translations.title}
      description={translations.description}
      onNext={onNext}
      onBack={onBack}
      timelineSteps={creationTimelineSteps}
      timelineCurrentStep={SharedWalletCreationStep.Quorum}
      isNextEnabled
    >
      <Flex gap="$16" flexDirection="column" alignItems="stretch">
        <RadioButtonGroup
          options={[
            {
              label: translations.optionAll,
              // eslint-disable-next-line react/no-multi-comp
              render: ({ optionElement }) => (
                <Box mb="$16">
                  <Card.Outlined data-testid={`setup-quorum-user-option-${QuorumRadioOption.AllAddresses}`}>
                    <Flex p="$16">{optionElement}</Flex>
                  </Card.Outlined>
                </Box>
              ),
              value: QuorumRadioOption.AllAddresses,
            },
            {
              label: translations.optionSome,
              // eslint-disable-next-line react/no-multi-comp
              render: ({ optionElement }) => (
                <Card.Outlined data-testid={`setup-quorum-user-option-${QuorumRadioOption.NOfK}`}>
                  <Flex p="$16" flexDirection="column">
                    <Box mb="$10">{optionElement}</Box>
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
                        value={value.option === QuorumRadioOption.NOfK ? String(value.numberOfCosigner) : '1'}
                        onChange={onNumberOfCosignerChange}
                        showArrow
                        zIndex={1001}
                      >
                        {cosignersNumberPickerOptions.map((num) => (
                          <Select.Item key={num} value={num} title={num} />
                        ))}
                      </Select.Root>
                      <Text.Body.Small>{translations.cosignersAmountPickerText}</Text.Body.Small>
                    </Flex>
                  </Flex>
                </Card.Outlined>
              ),
              value: QuorumRadioOption.NOfK,
            },
          ]}
          onValueChange={onOptionChange}
          selectedValue={value.option}
        />
      </Flex>
    </SharedWalletLayout>
  );
};
