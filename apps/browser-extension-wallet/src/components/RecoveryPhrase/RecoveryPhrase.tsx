import React from 'react';
import { BackButton, BackButtonProps } from '../BackButton';

export interface RecoveryPhraseProps {
  handleBack: BackButtonProps['onBackClick'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recoveryPhrase: any;
}

export const RecoveryPhrase = ({ handleBack }: RecoveryPhraseProps): React.ReactElement => (
  <div data-testid="recovery-phrase">
    <BackButton label="back" onBackClick={handleBack} dataTestid="recovery-phrase-back-btn" />
    {/* TODO: add wallet recovery phrase verification, jira ticket need to be added, mock ups as well */}
  </div>
);
