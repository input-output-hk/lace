import React, { useState } from 'react';
import styles from './QuorumOption.module.scss';
import { Card, RadioButton, Flex, Button, SelectGroup, Text, Box } from '@lace/ui';

export interface QuorumOptionProps {
  translations: {
    title: string;
    description: string;
    cosignersSentence: Record<'start' | 'end', string>;
    navigationButtons: Record<'back' | 'next', string>;
  };
  radioButtonOptions: Record<'allAddresses' | 'anyAddress' | 'someAddress', string>;
  cosignerValue: { label: string; value: string }[];
  onNext: (data: { userSelection: string; numberOfCosigner: string }) => void;
  onBack: () => void;
}

export const QuorumOption = ({
  translations: { title, description, cosignersSentence, navigationButtons },
  radioButtonOptions: { allAddresses, anyAddress, someAddress },
  cosignerValue,
  onBack,
  onNext
}: QuorumOptionProps): JSX.Element => {
  const [radioButtonValue, setRadioButtonValue] = useState('');
  const [cosignerSelection, setCosignerSelection] = useState<string | undefined>();

  const onChange = (eventValue: string) => {
    setRadioButtonValue(eventValue);
  };

  const radioButtonValues = [
    {
      value: 'allAddresses',
      label: allAddresses
    },
    {
      value: 'anyAddress',
      label: anyAddress
    },
    {
      value: 'someAddress',
      label: someAddress
    }
  ];

  const onSelectValueChange = (selectEventValue: string) => {
    setCosignerSelection(selectEventValue);
  };

  return (
    <div className={styles.QuorumOption} data-testid="shared-wallet-setup-quorum-container">
      <Text.Heading data-testid="shared-wallet-setup-quorum-user-header">{title}</Text.Heading>
      <Box mb="$28" mt="$20">
        <Text.Body.Normal data-testid="shared-wallet-setup-quorum-user-description">{description}</Text.Body.Normal>
      </Box>
      <Card.Outlined className={styles.cardContainer} data-testid="shared-wallet-setup-quorum-user-options">
        <RadioButton options={radioButtonValues} onValueChange={onChange} selectedValue={radioButtonValue} />
      </Card.Outlined>

      <Flex
        w="$fill"
        pt="$24"
        pb="$64"
        justifyContent="flex-start"
        alignItems="center"
        data-testid="shared-wallet-setup-quorum-cosigner-container"
      >
        <SelectGroup
          options={cosignerValue}
          placeholder="0"
          selectedValue={cosignerSelection}
          onValueChange={onSelectValueChange}
        />
        <Text.Body.Small className={styles.dropdownCopy}>
          {cosignersSentence.start} {cosignerValue.length} {cosignersSentence.end}
        </Text.Body.Small>
      </Flex>

      <Flex
        w="$fill"
        justifyContent="space-between"
        alignItems="center"
        data-testid="shared-wallet-setup-quorum-navigation"
      >
        <Button.Secondary label={navigationButtons.back} onClick={onBack} />
        <Button.CallToAction
          disabled={!radioButtonValue || !cosignerSelection}
          label={navigationButtons.next}
          onClick={() => onNext({ userSelection: radioButtonValue, numberOfCosigner: cosignerSelection })}
        />
      </Flex>
    </div>
  );
};
