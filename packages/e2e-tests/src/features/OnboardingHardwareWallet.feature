@OnboardingHardwareWallet @Onboarding @Testnet @Mainnet
Feature: Onboarding - Hardware wallet

  @LW-3367
  Scenario: Hardware Wallet - Connect button click
    When I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    Then "Connect Hardware Wallet" page is displayed

  @LW-3368
  Scenario: Hardware wallet - Legal page - next button disabled
    When I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    And "Next" button is disabled during onboarding process

  @LW-3374
  Scenario: Hardware wallet - Connect Hardware Wallet - back button click
    Given I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    And "Connect Hardware Wallet" page is displayed
    When I click "Back" button during wallet setup
    Then "Get started" page is displayed

  @LW-4993
  Scenario Outline: Hardware wallet - <mode> theme applied to onboarding pages
    Given I set <mode> theme mode in Local Storage
    When "Get started" page is displayed
    Then I see current onboarding page in <mode> mode
    And I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    And "Connect Hardware Wallet" page is displayed
    Then I see current onboarding page in <mode> mode
    Examples:
      | mode  |
      | dark  |
      | light |
