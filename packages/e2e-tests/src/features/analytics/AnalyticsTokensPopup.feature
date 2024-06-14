@Runner2 @Tokens-popup @Analytics @Testnet @Mainnet
Feature: Analytics - Tokens tab - Popup view

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
    And I validate that 3 analytics event(s) have been sent

  @LW-8709
  Scenario: Analytics - Popup view - Click Lace logo
    Given I navigate to Tokens popup page
    And I set up request interception for posthog analytics request(s)
    When I click on the logo icon
    Then I validate latest analytics single event "wallet | lace | click"
    And I validate that 1 analytics event(s) have been sent
