import { Button, Flex } from '@input-output-hk/lace-ui-toolkit';
import { PostHogAction } from '@lace/common';
import { Tooltip } from 'antd';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { useDelegationPortfolioStore } from '../../store';

type StepPreferencesFooterProps = {
  buttonTitle: string;
  disabled?: boolean;
  tooltip?: string;
};

export const StepPreferencesFooter = ({ buttonTitle, disabled = false, tooltip }: StepPreferencesFooterProps) => {
  const portfolioMutators = useDelegationPortfolioStore((state) => state.mutators);
  const { analytics } = useOutsideHandles();
  return (
    <Tooltip title={tooltip}>
      <Flex flexDirection="column" alignItems="stretch" gap="$16">
        <Button.CallToAction
          label={buttonTitle}
          data-testid="preferences-next-button"
          onClick={() => {
            analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsManageDelegationConfirmClick);
            portfolioMutators.executeCommand({
              type: 'DrawerContinue',
            });
          }}
          w="$fill"
          disabled={disabled}
        />
      </Flex>
    </Tooltip>
  );
};
