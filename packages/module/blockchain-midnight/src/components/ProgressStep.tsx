import {
  Icon,
  Loader,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React from 'react';

export const STATUS_GLYPH_SIZE = 18;
export const StepStatusGlyph = ({
  status,
}: {
  status: 'done' | 'failed' | 'pending' | 'running';
}) => {
  const { theme } = useTheme();
  switch (status) {
    case 'pending':
      return (
        <Icon
          name="Clock"
          size={STATUS_GLYPH_SIZE}
          color={theme.text.tertiary}
        />
      );
    case 'running':
      return <Loader size={STATUS_GLYPH_SIZE} />;
    case 'done':
      return (
        <Icon
          name="Checkmark"
          size={STATUS_GLYPH_SIZE}
          color={theme.data.positive}
        />
      );
    case 'failed':
      return (
        <Icon
          name="Cancel"
          size={STATUS_GLYPH_SIZE}
          color={theme.data.negative}
        />
      );
  }
};

interface ProgressStepProps {
  status: 'done' | 'failed' | 'pending' | 'running';
  label: string;
  testID?: string;
}

export const ProgressStep = ({ status, label, testID }: ProgressStepProps) => (
  <Row alignItems="center" gap={spacing.S} testID={testID}>
    <StepStatusGlyph status={status} />
    <Text.S variant={status === 'pending' ? 'secondary' : undefined}>
      {label}
    </Text.S>
  </Row>
);
