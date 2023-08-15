@General-extended
Feature: LW: General - extended view

  Background:
    Given Wallet is synced

  @LW-3226
  Scenario: Extended View - Currency symbol is correct when on different network
    Given I switch network to: "Preprod" in extended mode
    And Wallet is synced
    When I navigate to Tokens extended page
    Then I see tADA in the list of tokens
    When I navigate to Transactions extended page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    Then I see tADA in the list of transactions
    When I navigate to Staking extended page
    Then I see tADA in the cost column
    And I see tADA in current staked pool
    When I click "Send" button on page header
    And I’ve entered accepted values for all fields of simple Tx
    Then I see tADA in transaction fee
    When I click "Review transaction" button on "Send" page
    Then I see tADA in "Review transaction" transaction fee
    And I see tADA in "Review transaction" transaction amount
    And I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    Given I switch network to: "Mainnet" in extended mode
    And Wallet is synced
    When I navigate to Tokens extended page
    Then I see ADA in the list of tokens
    When I navigate to Transactions extended page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    Then I see ADA in the list of transactions
    When I navigate to Staking extended page
    Then I see ADA in the cost column
    And I see ADA in current staked pool
    When I click "Send" button on page header
    And I've entered accepted values for all Mainnet fields of simple Tx
    Then I see ADA in transaction fee
    When I click "Review transaction" button on "Send" page
    Then I see ADA in "Review transaction" transaction fee
    And I see ADA in "Review transaction" transaction amount

#  @LW-3226
#  Scenario Outline: Extended View - <currency symbol> is correct when on <net>
#    Given I switch network to: "<net>" in extended mode
#    And Wallet is synced
#    When I navigate to Tokens extended page
#    Then I see <currency symbol> in the list of tokens
#    When I navigate to Transactions extended page
#    And I wait for the transaction history to be loaded and all transactions to be confirmed
#    Then I see <currency symbol> in the list of transactions
#    When I navigate to Staking extended page
#    Then I see <currency symbol> in the cost column
#    And I see <currency symbol> in current staked pool
#    When I click "Send" button on page header
#    And I’ve entered accepted values for all fields of simple Tx
#    Then I see <currency symbol> in transaction fee
#    When I click "Review transaction" button on "Send" page
#    Then I see <currency symbol> in "Review transaction" transaction fee
#    And I see <currency symbol> in "Review transaction" transaction amount
#    Examples:
#      | currency symbol | net     |
#      | tADA            | Preprod |
#      | ADA             | Mainnet |

#  @LW-3226
#  Scenario Outline: Extended View - <currency symbol> is correct when on <net>
#    Given I switch network to <net>
#    When I navigate to Tokens extended page
#    Then I see <currency symbol> in the list of tokens
#    When I navigate to Transactions extended page
#    Then I see <currency_symbol> in the list of transactions
#    When I navigate to Staking extended page
#    Then I see <currency symbol> in the cost column
#    And I see <currency_symbol> in current staked pool
#    When I click "Send" button in header menu
#    And I’ve entered accepted values for all fields of simple Tx
#    Then I see <currency_symbol> in transaction fee
#    When I click "Review transaction" button
#    Then I see <currency_symbol> in transaction fee
#    And I see <currency_symbol> in transaction amount

#    And I am on the extended view - Tokens tab
#    Examples:
#      | currency symbol | net     |
#      | tADA            | Testnet |
#      | ADA             | Mainnet |

