@OwnTags-Extended
Feature: Own Tags - Extended View

  Background:
    Given Wallet is synced

  @LW-10486 @Testnet
  Scenario: Extended View - Own Tags / Sent - recipient within the (active account|different account|different wallet) are flagged as: own or foreign
    And I click "Send" button on page header
    And I fill bundle 1 with "MultiWallet1" other multiaddress address with following assets:
      | type | assetName | amount | ticker |
      | ADA  | Cardano   | 1      | tADA   |
    When I click "Add bundle" button on "Send" page
    And I fill bundle 2 with "MultiWallet1" second account address with following assets:
      | type | assetName | amount | ticker |
      | ADA  | Cardano   | 1      | tADA   |
    When I click "Add bundle" button on "Send" page
    And I fill bundle 3 with "MultiWallet2" main address with following assets:
      | type | assetName | amount | ticker |
      | ADA  | Cardano   | 1      | tADA   |
    When I click "Add bundle" button on "Send" page
    And I fill bundle 4 with "WalletReceiveSimpleTransactionE2E" main address with following assets:
      | type | assetName | amount | ticker |
      | ADA  | Cardano   | 1      | tADA   |
    And I click "Review transaction" button on "Send" page
    And The Tx summary screen is displayed for bundles with correct own / foreign tags

  @LW-10262 @Testnet
  Scenario: Extended View - Own Tags / Transaction details - all senders/recipients within the (active account|different account|different wallet) are flagged as: own or foreign
    When I navigate to Transactions extended page
    And I save tx hash value "dfd99f134fdc076464edf36ef64a053706ac76c2879aacc989e8b9001dc522dd"
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "core.activityDetails.sent" for 1 tokens with following details:
      | address                           | addressType    | ada       | addressTag |
      | MultiWallet1                      | second account | 1.00 tADA | own        |
      | MultiWallet2                      | main           | 1.00 tADA | own        |
      | WalletReceiveSimpleTransactionE2E | main           | 1.00 tADA | foreign    |

  @LW-10264 @Testnet
  Scenario Outline: Own Tags / Dapp transaction confirmation - in to section all senders/recipients within the (active account|different account|different wallet) are flagged as: own or foreign <wallet> <addressType>
    And I save token: "Cardano" balance
    And I open and authorize test DApp with "Only once" setting
    And I set send to wallet address to: "<wallet>" <addressType> in test DApp
    When I click "Send ADA" "Run" button in test DApp
    Then I see DApp connector "Confirm transaction" page with all UI elements and with following data in "Transaction Summary" section:
      | -<ada> tADA - FEE |
    And I expand "From address" section in DApp transaction window
    Then I see own tag on under address in "From address" section
    And I expand "To address" section in DApp transaction window
    Then I see <tag> tag on under address in "To address" section
    Examples:
      | wallet                            | addressType        | tag     | ada  |
      | MultiWallet1                      | other multiaddress | own     | 0.00 |
      | MultiWallet1                      | second account     | own     | 3.00 |
      | MultiWallet2                      | main               | own     | 3.00 |
      | WalletReceiveSimpleTransactionE2E | main               | foreign | 3.00 |
