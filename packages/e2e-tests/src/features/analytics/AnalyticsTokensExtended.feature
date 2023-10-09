@Tokens-extended @Testnet @Mainnet
Feature: Analytics -  Tokens tab - extended view

  Background:
    Given Wallet is synced

  @LW-8704
  Scenario: Analytics - Extended view - Tokens - Click token and view all transactions
    Given I am on NFTs extended page
    And I set up request interception for posthog analytics request(s)
    When I navigate to Tokens extended page
    Then I validate latest analytics single event "token | tokens | click"
    When I click token with name: "Cardano"
    Then I validate latest analytics single event "token | tokens | token row | click"
    When I click on "View all" button on token details drawer
    Then I validate latest analytics single event "token | token detail | view all | click"

  @LW-8706
  Scenario: Analytics - Extended view - Tokens - Close drawer
    Given I am on NFTs extended page
    And I set up request interception for posthog analytics request(s)
    When I navigate to Tokens extended page
    When I click token with name: "Cardano"
    And I close the drawer by clicking close button
    Then I validate latest analytics single event "token | token detail | x | click"
