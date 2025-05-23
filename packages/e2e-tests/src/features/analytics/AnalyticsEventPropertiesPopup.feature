@NFTs-Popup @Analytics @Testnet @Mainnet
Feature: Analytics - Posthog - Event properties

  Background:
    Given Wallet is synced

  @LW-8352
  Scenario: Analytics - Popup View - Verify event properties - Send - Send button
    Given I set up request interception for posthog analytics request(s)
    When I click 'Send' button on Tokens page in popup mode
    Then I validate latest analytics single event 'send | send | click'
    And I validate that the 'send | send | click' event includes property 'trigger_point' with value 'send button' in posthog

  @LW-8353
  Scenario: Analytics - Popup View - Verify event properties - Send - Send NFT button
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs popup page
    And I left click on the NFT with name 'Bison Coin' on NFTs page
    When I click 'Send NFT' button on NFT details drawer
    Then I validate latest analytics single event 'send | send | click'
    And I validate that the 'send | send | click' event includes property 'trigger_point' with value 'nfts page' in posthog

  @LW-8354
  Scenario: Analytics - Popup View - Verify event properties - Send - Send token
    Given I set up request interception for posthog analytics request(s)
    And I click token with name: 'Cardano'
    When I press keyboard Enter button
    Then I validate latest analytics single event 'send | send | click'
    And I validate that the 'send | send | click' event includes property 'trigger_point' with value 'tokens page' in posthog
