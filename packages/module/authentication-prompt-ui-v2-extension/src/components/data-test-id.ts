export const makeDataTestId = (
  suffix:
    | 'biometric-required-description'
    | 'biometric-required-title'
    | 'body'
    | 'button-cancel'
    | 'button-confirm'
    | 'go-to-settings-button'
    | 'input-hide-password'
    | 'input-show-password'
    | 'input'
    | 'message',
) => `authentication-prompt-${suffix}`;
