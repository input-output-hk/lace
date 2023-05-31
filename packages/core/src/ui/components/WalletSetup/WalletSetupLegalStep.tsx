/* eslint-disable react/no-multi-comp */
import React, { useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import styles from './WalletSetupLegalStep.module.scss';
import { Checkbox } from 'antd';
import { TranslationsFor } from '@ui/utils/types';
import { useTranslate } from '@src/ui/hooks';

export interface WalletSetupLegalStepProps {
  onBack: () => void;
  onNext: () => void;
  translations: TranslationsFor<'title' | 'toolTipText'>;
  isHardwareWallet?: boolean;
}

export const LegalTranslations = (): React.ReactElement => {
  const { Trans } = useTranslate();
  return (
    <Trans
      i18nKey="legal"
      // transSupportBasicHtmlNodes won't preserv tags attributes, so using the "components" prop instead
      components={{
        br: <br />,
        strong: <strong />,
        i: <i />,
        b: <b style={{ fontWeight: 600 }} />,
        div: <div />,
        u: <u />,
        uunderline: <u style={{ textDecoration: 'underline' }} />,
        a: <a />,
        privacyPolicy: (
          <a
            href="https://static.iohk.io/terms/iog-privacy-policy.pdf"
            style={{ textDecoration: 'underline' }}
            target="_blank"
          />
        ),
        iogdmcapolicy: (
          <a
            href="https://static.iohk.io/terms/iog-dmca-policy.pdf"
            style={{ textDecoration: 'underline' }}
            target="_blank"
          />
        ),
        rulesstreamlinedarbitration: <a href="http://www.jamsadr.com/rules-streamlined-arbitration" target="_blank" />,
        rulescomprehensivearbitration: (
          <a href="http://www.jamsadr.com/rules-comprehensive-arbitration/" target="_blank" />
        ),
        jamsadr: <a href="http://www.jamsadr.com" target="_blank" />,
        contactform: <a href="https://iohk.io/en/contact/" target="_blank" />
      }}
    />
  );
};

export const WalletSetupLegalStep = ({
  onBack,
  onNext,
  translations,
  isHardwareWallet = false
}: WalletSetupLegalStepProps): React.ReactElement => {
  const [areTermsAccepted, setAreTermsAccepted] = useState(false);

  return (
    <WalletSetupStepLayout
      isNextEnabled={areTermsAccepted}
      title={translations.title}
      onBack={onBack}
      onNext={onNext}
      toolTipText={translations.toolTipText}
      currentTimelineStep={WalletTimelineSteps.LEGAL_AND_ANALYTICS}
      isHardwareWallet={isHardwareWallet}
    >
      <div className={styles.walletSetupLegalStep} data-testid="wallet-setup-legal-text">
        <LegalTranslations />
        <div className={styles.acceptTerms} data-testid="wallet-setup-legal-terms-container">
          <Checkbox
            checked={areTermsAccepted}
            onChange={() => setAreTermsAccepted(!areTermsAccepted)}
            data-testid="wallet-setup-legal-terms-checkbox"
          >
            <p data-testid="wallet-setup-legal-terms-checkbox-description">I accept the Terms of Use</p>
          </Checkbox>
        </div>
      </div>
    </WalletSetupStepLayout>
  );
};
