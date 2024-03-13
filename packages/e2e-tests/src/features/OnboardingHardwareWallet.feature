@OnboardingHardwareWallet @Onboarding @Testnet @Mainnet
Feature: Onboarding - Hardware wallet

  @LW-3367
  Scenario: Hardware Wallet - Connect button click
    When I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    Then "Legal page" is displayed

  @LW-3368
  Scenario: Hardware wallet - Legal page - next button disabled
    When I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    Then "Legal page" is displayed
    And "Next" button is disabled during onboarding process

  @LW-3369
  Scenario: Hardware wallet - Legal page - accept T&C - next button enabled
    When I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    Then "Legal page" is displayed
    When I accept "T&C" checkbox
    Then "Next" button is enabled during onboarding process

  @LW-3370
  Scenario: Hardware wallet - Legal page - accept T&C - back button
    Given I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    When I click "Back" button during wallet setup
    Then "Get started" page is displayed

  @LW-3371
  Scenario: Hardware wallet - Help us improve your experience page displayed
    Given I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    And I am on "Legal page"
    When I click "Next" button during wallet setup
    Then "Help us improve your experience" page is displayed

  @LW-4662
  Scenario: Hardware wallet - Help us improve your experience - Privacy Policy link
    Given I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    And I am on "Lace terms of use" page and accept terms
    And I am on "Help us improve your experience" page
    When I click on Privacy Policy link
    Then Privacy Policy is displayed in new tab

  @LW-3372
  Scenario Outline: Hardware wallet - Help us improve your experience - <button> button click
    Given I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    And I am on "Lace terms of use" page and accept terms
    And I am on "Help us improve your experience" page
    When I click "<button>" button on Analytics page
    Then "Connect Hardware Wallet" page is displayed
    Examples:
      | button |
      | Skip   |
      | Agree  |

  @LW-3373
  Scenario: Hardware wallet - Help us improve your experience - back button click
    Given I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    And I am on "Lace terms of use" page and accept terms
    And I am on "Help us improve your experience" page
    When I click "Back" button during wallet setup
    Then "Legal page" is displayed

  @LW-3374
  Scenario: Hardware wallet - Connect Hardware Wallet - back button click
    Given I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    And I am on "Connect Hardware Wallet" page
    When I click "Back" button during wallet setup
    Then "Help us improve your experience" page is displayed

  @LW-4993
  Scenario Outline: Hardware wallet - <mode> theme applied to onboarding pages
    Given I set <mode> theme mode in Local Storage
    When "Get started" page is displayed
    Then I see current onboarding page in <mode> mode
    And I click "Connect" button on wallet setup page
    And I click "OK" button on "Limited support for DApp" modal
    When "Legal page" is displayed
    Then I see current onboarding page in <mode> mode
    And I accept "T&C" checkbox
    And I click "Next" button during wallet setup
    When "Help us improve your experience" page is displayed
    Then I see current onboarding page in <mode> mode
    And I click "Next" button during wallet setup
    When "Connect Hardware Wallet" page is displayed
    Then I see current onboarding page in <mode> mode
    Examples:
      | mode  |
      | dark  |
      | light |
