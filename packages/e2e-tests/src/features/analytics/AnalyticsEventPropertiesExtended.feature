@NFTs-Extended @Analytics @Testnet @Mainnet
Feature: Analytics - Posthog - Event properties

  Background:
    Given Wallet is synced

  @LW-7703
  Scenario: Analytics - Verify event properties
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs extended page
    And I validate that event has correct properties

  @LW-8349
  Scenario: Analytics - Extended View - Verify event properties - Send - Send button
    Given I set up request interception for posthog analytics request(s)
    When I click "Send" button on page header
    Then I validate that the event includes "trigger_point" property
    And I validate that the "send | send | click" event includes property "trigger_point" with value "send button" in posthog

  @LW-8350
  Scenario: Analytics -Extended View - Verify event properties - Send - Send NFT button
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs extended page
    And I left click on the NFT with name "Bison Coin" on NFTs page
    When I click "Send NFT" button on NFT details drawer
    Then I validate that the event includes "trigger_point" property
    And I validate that the "send | send | click" event includes property "trigger_point" with value "nfts page" in posthog

  @LW-8351
  Scenario: Analytics -Extended View - Verify event properties - Send - Send token
    Given I set up request interception for posthog analytics request(s)
    And I click token with name: "Cardano"
    When I press keyboard Enter button
    Then send drawer is displayed with all its components in extended mode
    Then I validate that the event includes "trigger_point" property
    And I validate that the "send | send | click" event includes property "trigger_point" with value "tokens page" in posthog
