@TrezorOnboarding @Trezor @Testnet
Feature: Trezor Onboarding

  @LW-7877 @Pending
  Scenario: Onboarding Trezor wallet
    And I connect, unlock and enter correct pin on Trezor emulator
    And I force the Trezor account setup page to open
    And I click "Next" button during wallet setup
    And I reject analytics and click "Allow once for this session" on Trezor Connect page
    And I click "Export" on Trezor Connect page
    And I confirm exporting public key on Trezor emulator
    And I switch to window with Lace
    Then I see LW homepage
