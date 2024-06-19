@NetworkSwitching-popup @Testnet @Mainnet
Feature: LW: Network Switching - popup view

  Background:
    Given Wallet is synced

  @LW-3227
  Scenario Outline: Popup View - Currency symbol is correct when on different network
    Given I switch network to: "<network>" in popup mode
    And Wallet is synced
    When I navigate to Tokens popup page
    Then I see <ticker> in the list of tokens
    When I navigate to Transactions popup page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    Then I see <ticker> in the list of transactions
    When I navigate to Staking popup page
    Then I see <ticker> in current staked pool
    When I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And I've entered accepted values for all <network> fields of simple Tx
    Then I see <ticker> in transaction fee
    When I click "Review transaction" button on "Send" page
    Then I see <ticker> in "Review transaction" transaction fee
    And I see <ticker> in "Review transaction" transaction amount
    Examples:
      | network | ticker |
      | Preprod | tADA   |
      | Mainnet | ADA    |
