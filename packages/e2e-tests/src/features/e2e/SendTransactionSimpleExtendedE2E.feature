@SendSimpleTransaction-Extended-E2E @Testnet
Feature: Send Simple Transactions - Extended view - E2E

  Background:
    Given Wallet is synced

  @LW-2375
  Scenario: Extended-view - Send ADA (single asset) E2E
    And I save token: "Cardano" balance in extended mode
    And I click "Send" button on page header
    And I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    And I save fee value
    And I click "Confirm" button on "Transaction summary" page
    And I fill correct password and confirm
    Then The Transaction submitted screen is displayed:
      | Title: "All done"                            |
      | Subtitle: "The transaction will complete..." |
      | Text: transaction hash                       |
      | Button: "View transaction"                   |
      | Button: "Close"                              |
    When I close the drawer by clicking close button
    And I navigate to Tokens extended page
    Then the sent amount of: 1.123 with fee: saved for token "Cardano" is subtracted from the total balance in extended mode
    When I navigate to Transactions extended page
    Then the Sent transaction is displayed with value: "1.12 tADA" and tokens count 1
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "package.core.transactionDetailBrowser.sent" for ADA with value: 1.12 and wallet: "WalletReceiveSimpleTransactionE2E" address
    When I open wallet: "WalletReceiveSimpleTransactionE2E" in: extended mode
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with value: "1.12 tADA" and tokens count 1
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "package.core.transactionDetailBrowser.received" for ADA with value: 1.12 and wallet: "WalletSendSimpleTransactionE2E" address

  @LW-4677
  Scenario: Extended-view - Self Transaction E2E
    And I click "Receive" button on page header
    And I click "Copy" button on "Wallet Address" page
    Then I see a toast with message: "core.infoWallet.addressCopied"
    And I close the drawer by clicking close button
    And I click "Send" button on page header
    And I fill bundle 1 with "CopiedAddress" address with following assets:
      | type | assetName | amount |
      | ADA  | tADA      | 5      |
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I fill correct password and confirm
    Then The Transaction submitted screen is displayed:
      | Title: "All done"                            |
      | Subtitle: "The transaction will complete..." |
    When I close the drawer by clicking close button
    And I navigate to Transactions extended page
    And I can see transaction 1 with type "Self Transaction"

  @LW-5894
  Scenario: Extended View - transaction details - Hash does not contain cexplorer link until transaction is confirmed
    When I click "Send" button on page header
    And I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I fill correct password and confirm
    When I click "View transaction" button on submitted transaction page
    And I click on a transaction: 1
    And I click on a transaction hash
    Then I see a toast with message: "general.clipboard.copiedToClipboard"
    And I see 1 opened tab(s)
    When I wait for the transaction history to be loaded and all transactions to be confirmed
    And I click on a transaction hash and save hash information
    Then I see 2 opened tab(s)
    When I switch to last window
    Then I see cexplorer url with correct transaction hash
