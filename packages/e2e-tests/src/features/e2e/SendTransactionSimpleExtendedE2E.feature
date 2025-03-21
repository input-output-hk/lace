@SendSimpleTransaction-Extended-E2E @E2E @Testnet
Feature: Send Simple Transactions - Extended view - E2E

  Background:
    Given Wallet is synced

  @LW-2375 @memory-snapshot
  Scenario: Extended-view - Send ADA (single asset) E2E
    And I save token: "Cardano" balance
    And I click "Send" button on page header
    And I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" main address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    And I save fee value
    And I click "Confirm" button on "Transaction summary" page
    And I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in extended mode
    And valid password is not in snapshot
    When I close the drawer by clicking close button
    And I navigate to Tokens extended page
    Then the sent amount of: "1.123" with "saved" fee for token "Cardano" is subtracted from the total balance
    When I navigate to Activity extended page
    Then the Sent transaction is displayed with value: "1.29 tADA" and tokens count 1
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "core.activityDetails.sent" for ADA with value: 1.12 and wallet: "WalletReceiveSimpleTransactionE2E" address
    When I open wallet: "WalletReceiveSimpleTransactionE2E" in: extended mode
    And Wallet is synced
    And I navigate to Activity extended page
    Then the Received transaction is displayed with value: "1.12 tADA" and tokens count 1
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "core.activityDetails.received" for ADA with value: 1.12 and wallet: "WalletSendSimpleTransactionE2E" address

  @LW-4677
  Scenario: Extended-view - Self Transaction E2E
    And I click "Receive" button on page header
    And I click "Copy" button on "Receive" page for default wallet address
    Then I see a toast with text: "Copied to clipboard"
    And I close the drawer by clicking close button
    And I click "Send" button on page header
    And I fill bundle with copied address and 5 ADA
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in extended mode
    When I close the drawer by clicking close button
    And I navigate to Activity extended page
    And I can see transaction 1 with type "Self Transaction"

  @LW-5894
  Scenario: Extended View - transaction details - Hash does not contain cexplorer link until transaction is confirmed
    When I click "Send" button on page header
    And I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" main address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I enter correct password and confirm the transaction
    When I click "View transaction" button on submitted transaction page
    And I click on a transaction: 1
    And I click on a transaction hash
    Then I see a toast with text: "Copied to clipboard"
    And I see 1 opened tab(s)
    When I wait for the transaction history to be loaded and all transactions to be confirmed
    And I close the drawer by clicking close button
    And I click on a transaction: 1
    And I click on a transaction hash and save hash information
    Then I see 2 opened tab(s)
    When I switch to last window
    Then I see cexplorer url with correct transaction hash
