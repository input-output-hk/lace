import { Button, Flex } from '@lace/ui';
import { Tooltip } from 'antd';
import { useDelegationPortfolioStore } from '../../store';

type StepPreferencesFooterProps = {
  buttonTitle: string;
  disabled?: boolean;
  tooltip?: string;
};

export const StepPreferencesFooter = ({ buttonTitle, disabled = false, tooltip }: StepPreferencesFooterProps) => {
  const portfolioMutators = useDelegationPortfolioStore((state) => state.mutators);
  return (
    <Tooltip title={tooltip}>
      <Flex flexDirection="column" alignItems="stretch" gap="$16">
        <Button.CallToAction
          label={buttonTitle}
          data-testid="preferences-next-button"
          onClick={() =>
            portfolioMutators.executeCommand({
              type: 'DrawerContinue',
            })
          }
          w="$fill"
          disabled={disabled}
        />
      </Flex>
    </Tooltip>
  );
};
