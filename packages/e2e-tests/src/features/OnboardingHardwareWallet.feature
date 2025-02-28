@OnboardingHardwareWallet @Onboarding @Testnet @Mainnet
@SkipFirefox
Feature: Onboarding - Hardware wallet

  @LW-3367
  Scenario: Hardware Wallet - Connect button click
    When I click "Connect" button on wallet setup page
    Then "Connect your device" page is displayed

  @LW-3374
  Scenario: Hardware wallet - Connect your device - back button click
    Given I click "Connect" button on wallet setup page
    And "Connect your device" page is displayed
    When I click "Back" button during wallet setup
    Then "Get started" page is displayed

  @LW-4993
  Scenario Outline: Hardware wallet - <mode> theme applied to onboarding pages
    Given I set <mode> theme mode in Local Storage
    When "Get started" page is displayed
    Then I see current onboarding page in <mode> mode
    And I click "Connect" button on wallet setup page
    And "Connect your device" page is displayed
    Then I see current onboarding page in <mode> mode
    Examples:
      | mode  |
      | dark  |
      | light |

  @LW-10309
  Scenario: Hardware wallet - Connect your device - "No hardware wallet device was chosen." error
    When I click "Connect" button on wallet setup page
    # Step below triggers error by closing HID window
    And I switch to window with Lace
    Then "No hardware wallet device was chosen." error is displayed on "Connect your device" page
    And "Try again" button is enabled on "Connect your device" page
