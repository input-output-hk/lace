@Tokens-popup @Testnet @Mainnet
Feature: Analytics -  Tokens tab - Popup view

  Background:
    Given Wallet is synced

  @LW-8705
  Scenario: Analytics - Popup view - Click token and view all transactions
    Given I am on NFTs popup page
    And I set up request interception for posthog analytics request(s)
    When I navigate to Tokens popup page
    Then I validate latest analytics single event "token | tokens | click"
    When I click token with name: "Cardano"
    Then I validate latest analytics single event "token | tokens | token row | click"
    When I click on "View all" button on token details drawer
    Then I validate latest analytics single event "token | token detail | view all | click"