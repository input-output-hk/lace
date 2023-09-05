@NFTs-Extended @Analytics @Testnet @Mainnet
Feature: Analytics - Posthog - Event properties

  Given Wallet is synced

  @LW-7703
  Scenario: Analytics - Verify event properties
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs extended page
    And I validate that event has correct properties
