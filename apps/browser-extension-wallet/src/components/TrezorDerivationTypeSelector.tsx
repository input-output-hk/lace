import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, Box, InfoComponent, Tooltip } from '@input-output-hk/lace-ui-toolkit';
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
      label: t('core.derivationType.icarus', 'Icarus'),
      description: t(
        'core.derivationType.icarusDescription',
        'Most common for wallets created with software applications'
      ),
      supported: true
    },
    {
      value: 'ICARUS_TREZOR',
      label: t('core.derivationType.icarusTrezor', 'Icarus Trezor'),
      description: t(
        'core.derivationType.icarusTrezorDescription',
        'Default for Trezor hardware wallets (supports 24-word seed phrases)'
      ),
      supported: true
    },
    {
      value: 'LEDGER',
      label: t('core.derivationType.ledger', 'Ledger'),
      description: t('core.derivationType.ledgerDescription', 'For wallets originally created on Ledger devices'),
      supported: true
    }
  ];

  const selectedType = derivationTypes.find((type) => type.value === (value || 'ICARUS'));

  return (
    <Box>
      <div className={styles.container}>
        <div className={styles.header}>
          <label className={styles.label}>{t('core.derivationType.selectDerivationType', 'Derivation type')}</label>
          <Tooltip
            label={t(
              'core.derivationType.infoTooltip',
              'Determines how wallet addresses are generated from your seed phrase.'
            )}
            align="start"
            side="top"
          >
            <InfoComponent data-testid="derivation-type-info" />
          </Tooltip>
        </div>
        <div className={styles.content}>
          <div className={styles.selectWrapper}>
            <Select.Root
              variant="outline"
              value={value || 'ICARUS'}
              onChange={(newValue) => onChange(newValue as DerivationType)}
              disabled={disabled}
              showArrow
              placeholder={t('core.derivationType.selectDerivationType', 'Derivation type')}
              triggerTestId="derivation-type-selector"
              zIndex={1000}
            >
              {derivationTypes
                .filter((type) => type.supported)
                .map((type) => (
                  <Select.Item key={type.value} value={type.value} title={type.label} />
                ))}
            </Select.Root>
          </div>
          <p className={styles.description}>{selectedType?.description || ''}</p>
        </div>
      </div>
    </Box>
  );
};
