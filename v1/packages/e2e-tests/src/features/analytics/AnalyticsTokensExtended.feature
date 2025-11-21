@Tokens-extended @Analytics @Testnet @Mainnet
Feature: Analytics - Tokens tab - extended view

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
    And I validate that 3 analytics event(s) have been sent

  @LW-8706
  Scenario: Analytics - Extended view - Tokens - Close drawer
    Given I am on NFTs extended page
    When I navigate to Tokens extended page
    When I click token with name: "Cardano"
    And I set up request interception for posthog analytics request(s)
    And I close the drawer by clicking close button
    Then I validate latest analytics single event "token | token detail | x | click"
    And I validate that 1 analytics event(s) have been sent

  @LW-8710
  Scenario: Analytics - Extended view - Click Lace logo
    Given I navigate to Tokens extended page
    And I set up request interception for posthog analytics request(s)
    When I click on the logo icon
    Then I validate latest analytics single event "wallet | lace | click"
    And I validate that 1 analytics event(s) have been sent
