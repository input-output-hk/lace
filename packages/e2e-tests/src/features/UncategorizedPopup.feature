@Uncategorized-popup
Feature: LW: Uncategorized - popup view

  Background:
    Given Wallet is synced

  @LW-3227
  Scenario: Popup View - Currency symbol is correct when on different network
    Given I switch network to: "Preprod" in popup mode
    And Wallet is synced
    When I navigate to Tokens popup page
    Then I see tADA in the list of tokens
    When I navigate to Transactions popup page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    Then I see tADA in the list of transactions
    When I navigate to Staking popup page
    Then I see tADA in current staked pool
    When I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And I’ve entered accepted values for all fields of simple Tx
    Then I see tADA in transaction fee
    When I click "Review transaction" button on "Send" page
    Then I see tADA in "Review transaction" transaction fee
    And I see tADA in "Review transaction" transaction amount
    And I close the drawer by clicking back button
    And I close the drawer by clicking back button
    And I click "Agree" button on "You'll have to start again" modal
    Given I switch network to: "Mainnet" in popup mode
    And Wallet is synced
    When I navigate to Tokens popup page
    Then I see ADA in the list of tokens
    When I navigate to Transactions popup page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    Then I see ADA in the list of transactions
    When I navigate to Staking popup page
    Then I see ADA in current staked pool
    When I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And I've entered accepted values for all Mainnet fields of simple Tx
    Then I see ADA in transaction fee
    When I click "Review transaction" button on "Send" page
    Then I see ADA in "Review transaction" transaction fee
    And I see ADA in "Review transaction" transaction amount

