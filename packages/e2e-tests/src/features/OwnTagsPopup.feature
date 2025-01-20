@OwnTags-Popup
Feature: Own Tags - Popup View

  Background:
    Given Wallet is synced

  @LW-10487 @Testnet
  Scenario Outline: Popup View - Own Tags / Sent - recipient within the (active account|different account|different wallet) are flagged as: own or foreign / <address> <addressType> address
    And I click "Send" button on Tokens page in popup mode
    And I fill bundle 1 with "<address>" <addressType> address with following assets:
      | type | assetName | amount | ticker |
      | ADA  | Cardano   | 1      | tADA   |
    And I click "Review transaction" button on "Send" page
    Then The Tx summary screen is displayed for "<address>" <addressType> address with "<tag>" tag
    Examples:
      | address                           | addressType        | tag     |
      | MultiWallet1                      | other multiaddress | own     |
      | MultiWallet1                      | second account     | own     |
      | MultiWallet2                      | main               | own     |
      | WalletReceiveSimpleTransactionE2E | main               | foreign |

  @LW-10263 @Testnet
  Scenario: Popup View - Own Tags / Transaction details - all senders/recipients within the (active account|different account|different wallet) are flagged as: own or foreign
    When I navigate to Activity popup page
    And I save tx hash value "010403d479efd4824e7f216eabb8c39e7a748dfb80df4c7cc4d4036677affc07"
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "core.activityDetails.sent" for 1 tokens with following details:
      | address                           | addressType        | ada       | addressTag |
      | MultiWallet2                      | main               | 1.00 tADA | own        |
      | MultiWallet1                      | second account     | 1.00 tADA | own        |
      | WalletReceiveSimpleTransactionE2E | main               | 1.00 tADA | foreign    |
