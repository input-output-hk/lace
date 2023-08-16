@OnboardingCreateWallet @Testnet @Mainnet @Pending
Feature: Analytics - Posthog - Event properties

  @LW-7703
  Scenario: Verify event properties
    Given I set up request interception for posthog analytics request(s)
    When I click "Create" button on wallet setup page
    And I validate that event has correct properties
