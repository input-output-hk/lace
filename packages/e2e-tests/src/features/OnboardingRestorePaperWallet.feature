@OnboardingRestorePaperWallet @Onboarding @Testnet @Mainnet
Feature: Onboarding - Paper Wallet - Restore wallet

  @LW-11168
  Scenario: Onboarding - Restore - Choose a recovery method - Paper Wallet - click "Next" button
    Given Set camera access permission: granted
    When I click "Restore" button on wallet setup page
    And I select "Paper wallet" as a recovery method
    And I click "Next" button during wallet setup
    Then "Scan your private QR code" page is displayed

  @LW-11169
  Scenario: Onboarding - Restore - Choose a recovery method - Paper Wallet - click "Back" button
    When I click "Create" button on wallet setup page
    And I click "Back" button during wallet setup
    Then "Get started" page is displayed
