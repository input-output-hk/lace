@OnboardingCreateWallet @Analytics @Testnet
Feature: Analytics - Posthog - Onboarding - Extended View

  @LW-8311 @Pending @issue=LW-10488
  Scenario Outline: Analytics - Posthog events are enabled or disabled based on decision <enable_analytics> on Analytics page
    Given "Get started" page is displayed
    When I enable showing Analytics consent banner
    And I set up request interception for posthog analytics request(s)
    And I <enable_analytics> analytics banner on "Get started" page
    And I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow and "not fill" values
    Then I validate that <number_of_events> analytics event(s) have been sent
    Examples:
      | enable_analytics | number_of_events |
      | accept           | 4                |
      | reject           | 1                |

  @LW-7363
  Scenario: Analytics - Restore wallet events / check that alias event is assigning same id in posthog
    Given I set up request interception for posthog analytics request(s)
    When I click "Restore" button on wallet setup page
    And I go to "Mnemonic verification" page from "Restore" wallet flow
    Then I validate latest analytics single event "onboarding | restore wallet revamp | restore | click"
    When I click "Next" button during wallet setup
    Then "Wallet setup" page is displayed
    And I validate latest analytics single event "onboarding | restore wallet revamp |  enter your recovery phrase  | next | click"
    When I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Enter wallet" button
    Then I validate latest analytics multiple events:
      | onboarding \| restore wallet revamp \| let's set up your new wallet \| enter wallet \| click |
      | $create_alias                                                                                |
    And I validate that alias event has assigned same user id "5b3ca1f1f7a14aad1e79f46213e2777d" in posthog

  @LW-7365 @Pending @issue=LW-10488
  Scenario: Analytics - Onboarding new wallet events
    Given "Get started" page is displayed
    When I enable showing Analytics consent banner
    And I set up request interception for posthog analytics request(s)
    And I accept analytics banner on "Get started" page
    Then I validate latest analytics single event "wallet | onboarding | analytics banner | agree | click"
    When I click "Create" button on wallet setup page
    Then I validate latest analytics single event "onboarding | new wallet revamp | create | click"
    When I go to "Mnemonic verification" page from "Create" wallet flow
    Then I validate latest analytics single event "onboarding | new wallet revamp | save your recovery phrase | next | click"
    When I click "Next" button during wallet setup
    Then "Wallet setup" page is displayed
    And I validate latest analytics single event "onboarding | new wallet revamp | enter your recovery phrase | next | click"
    When I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Enter wallet" button
    Then I validate latest analytics multiple events:
      | onboarding \| new wallet revamp \| let's set up your new wallet \| enter wallet \| click |
      | $create_alias                                                                            |
    And I validate that 6 analytics event(s) have been sent

  @LW-7364 @Pending
    # Disabled as user is opted out until he decision about tracking.
  Scenario: Analytics - Restore wallet events - cancel on "Restoring a multi-address wallet?" modal
    Given I set up request interception for posthog analytics request(s)
    When I click "Restore" button on wallet setup page
    Then I validate latest analytics single event "onboarding | restore wallet | restore | click"
    When I click "Cancel" button on "Restoring a multi-address wallet?" modal
    Then I validate latest analytics single event "onboarding | restore wallet | warning multi-address wallet | cancel | click"
    And I validate that 2 analytics event(s) have been sent
