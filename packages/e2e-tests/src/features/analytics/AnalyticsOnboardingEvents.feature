@OnboardingCreateWallet @Analytics @Testnet
Feature: Analytics - PostHog - Onboarding - Extended View

  @LW-12966
  Scenario: Analytics - PostHog events are enabled by default
    Given "Get started" page is displayed
    Then Local Storage "analyticsStatus" key has "ACCEPTED" value
    When I set up request interception for posthog analytics request(s)
    And I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow and fill values
    Then I validate that 6 analytics event(s) have been sent

  @LW-7363
  Scenario: Analytics - Restore wallet events / check that alias event is assigning same id in posthog
    Given I set up request interception for posthog analytics request(s)
    When I click "Restore" button on wallet setup page
    Then I validate latest analytics single event "onboarding | restore wallet revamp | restore | click"
    When I click "Next" button during wallet setup
    Then I validate latest analytics single event "onboarding | restore wallet revamp paper wallet | choose mode | next | click"
    When I go to "Mnemonic verification" page from "Restore" wallet flow and fill values
    And I click "Next" button during wallet setup
    Then "Wallet setup" page is displayed
    And I validate latest analytics single event "onboarding | restore wallet revamp |  enter your recovery phrase  | next | click"
    When I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Enter wallet" button
    Then I validate latest analytics single event "onboarding | restore wallet revamp | added"
    And I wait for main loader to disappear
    And "$create_alias" PostHog event was sent
    And I validate that alias event has assigned same user id "f8a1e17e98bf157a31a082a2e4ad85a0" in posthog

  @LW-7365
  Scenario: Analytics - Onboarding new wallet events
    Given "Get started" page is displayed
    And I set up request interception for posthog analytics request(s)
    And I click "Create" button on wallet setup page
    Then I validate latest analytics single event "onboarding | new wallet revamp | create | click"
    When I click "Next" button during wallet setup
    When I click on "Copy to clipboard" button
    Then I validate latest analytics single event "onboarding | new wallet revamp | save your recovery phrase | copy to clipboard | click"
    When I click "Next" button during wallet setup
    Then I validate latest analytics single event "onboarding | new wallet revamp | save your recovery phrase | next | click"
    When I click on "Paste from clipboard" button
    Then I validate latest analytics single event "onboarding | new wallet revamp | enter your recovery phrase | paste from clipboard | click"
    When I click "Next" button during wallet setup
    Then "Wallet setup" page is displayed
    And I validate latest analytics single event "onboarding | new wallet revamp | enter your recovery phrase | next | click"
    When I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Enter wallet" button
    Then I validate latest analytics multiple events:
      | onboarding \| new wallet revamp \| let's set up your new wallet \| enter wallet \| click |
      | onboarding \| new wallet revamp \| added                                                 |
    And I validate that 8 analytics event(s) have been sent
    And "$create_alias" PostHog event was sent
