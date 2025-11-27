import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, InfoComponent, Tooltip } from '@input-output-hk/lace-ui-toolkit';
import { DerivationType } from '@lace/cardano';
import styles from './TrezorDerivationTypeSelector.module.scss';

interface TrezorDerivationTypeSelectorProps {
  value?: DerivationType;
  onChange: (derivationType: DerivationType) => void;
  disabled?: boolean;
}

export const TrezorDerivationTypeSelector: React.FC<TrezorDerivationTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const { t } = useTranslation();

  const derivationTypes = [
    {
      value: 'ICARUS',
      label: t('core.derivationType.icarus'),
      description: t('core.derivationType.icarusDescription')
    },
    {
      value: 'ICARUS_TREZOR',
      label: t('core.derivationType.icarusTrezor'),
      description: t('core.derivationType.icarusTrezorDescription')
    },
    {
      value: 'LEDGER',
      label: t('core.derivationType.ledger'),
      description: t('core.derivationType.ledgerDescription')
    }
  ];

  // Create tooltip content with all derivation type descriptions
  const tooltipContent = (
    <div>
      {derivationTypes.map((type) => (
        <div key={type.value} style={{ marginBottom: '4px' }}>
          <strong>{type.label}:</strong> {type.description}
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>{t('core.derivationType.selectDerivationType')}</label>
        <Tooltip label={tooltipContent} align="start" side="bottom">
          <InfoComponent data-testid="derivation-type-info" />
        </Tooltip>
      </div>
      <div className={styles.content}>
        <Select.Root
          variant="outline"
          value={value || 'ICARUS'}
          onChange={(newValue) => onChange(newValue as DerivationType)}
          disabled={disabled}
          showArrow
          placeholder={t('core.derivationType.selectDerivationType')}
          triggerTestId="derivation-type-selector"
          zIndex={1000}
        >
          {derivationTypes.map((type) => (
            <Select.Item key={type.value} value={type.value} title={type.label} />
          ))}
        </Select.Root>
      </div>
    </div>
  );
};
