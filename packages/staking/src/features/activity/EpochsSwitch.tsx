import { ControlButton, Flex, Text } from '@lace/ui';

// eslint-disable-next-line no-magic-numbers
const EPOCHS_OPTIONS = [5, 15];

export type EpochsSwitchProps = {
  epochsCount: number;
  setEpochsCount: (epochsCount: number) => void;
};

export const EpochsSwitch = ({ epochsCount, setEpochsCount }: EpochsSwitchProps) => (
  <Flex p="$8" gap="$8" alignItems="center">
    <Text.Body.Normal>Epochs:</Text.Body.Normal>
    {EPOCHS_OPTIONS.map((option, i) => {
      const activeOption = epochsCount === option;
      const Component = activeOption ? ControlButton.Filled : ControlButton.Outlined;
      return <Component key={i} label={`Last ${option}`} onClick={() => setEpochsCount(option)} />;
    })}
  </Flex>
);
