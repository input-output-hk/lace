import { Button, Flex } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useDelegationPortfolioStore } from '../../store';

export const StepPreferencesFooter = () => {
  const { t } = useTranslation();
  const portfolioMutators = useDelegationPortfolioStore((store) => store.mutators);

  return (
    <Flex flexDirection="column" alignItems="stretch" gap="$16">
      <Button.CallToAction
        label={t('drawer.preferences.nextButton')}
        data-testid="preferences-next-button"
        onClick={() =>
          portfolioMutators.executeCommand({
            type: 'DrawerContinue',
          })
        }
        w="$fill"
      />
    </Flex>
  );
};
