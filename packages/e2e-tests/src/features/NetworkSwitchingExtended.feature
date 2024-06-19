@NetworkSwitching-extended @Testnet @Mainnet
Feature: LW: Network Switching - extended view

  Background:
    Given Wallet is synced
    And I disable showing Multidelegation beta banner
    And I disable showing Multidelegation persistence banner

  @LW-3226
  Scenario Outline: Extended View - Currency symbol is correct when on different network
    Given I switch network to: "<network>" in extended mode
    And Wallet is synced
    When I navigate to Tokens extended page
    Then I see <ticker> in the list of tokens
    When I navigate to Transactions extended page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    Then I see <ticker> in the list of transactions
    When I navigate to Staking extended page
    Then I see <ticker> in current staked pool
    When I click "Send" button on page header
    And I've entered accepted values for all <network> fields of simple Tx
    Then I see <ticker> in transaction fee
    When I click "Review transaction" button on "Send" page
    Then I see <ticker> in "Review transaction" transaction fee
    And I see <ticker> in "Review transaction" transaction amount
    Examples:
      | network | ticker |
      | Preprod | tADA   |
      | Mainnet | ADA    |
