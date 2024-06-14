@Runner2 @SendSimpleTransaction-Popup-E2E @E2E @Testnet
Feature: Send Simple Transactions - Popup view - E2E

  Background:
    Given Wallet is synced

  @LW-2409
  Scenario: Popup-view - Send ADA (single asset) E2E
    And I save token: "Cardano" balance
    And I click "Send" button on Tokens page in popup mode
    And I fill bundle 1 with "WalletReceiveSimpleTransaction2E2E" main address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    And I save fee value
    And I click "Confirm" button on "Transaction summary" page
    And I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in popup mode
    When I close the drawer by clicking close button
    And I navigate to Tokens popup page
    Then the sent amount of: "1.123" with "saved" fee for token "Cardano" is subtracted from the total balance
    When I navigate to Transactions popup page
    Then the Sent transaction is displayed with value: "1.12 tADA" and tokens count 1
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "core.activityDetails.sent" for ADA with value: 1.12 and wallet: "WalletReceiveSimpleTransaction2E2E" address
    When I open wallet: "WalletReceiveSimpleTransaction2E2E" in: popup mode
    And Wallet is synced
    And I navigate to Transactions popup page
    Then the Received transaction is displayed with value: "1.12 tADA" and tokens count 1
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "core.activityDetails.received" for ADA with value: 1.12 and wallet: "WalletSendSimpleTransaction2E2E" address

  @LW-4678
  Scenario: Popup-view - Self Transaction E2E
    And I click "Receive" button on Tokens page in popup mode
    And I click "Copy" button on "Receive" page for default wallet address
    Then I see a toast with text: "Address copied"
    And I close the drawer by clicking close button
    And I click "Send" button on Tokens page in popup mode
    And I fill bundle with copied address and 5 ADA
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in popup mode
    When I close the drawer by clicking close button
    And I navigate to Transactions popup page
    And I can see transaction 1 with type "Self Transaction"

  @LW-5895
  Scenario: Popup View - transaction details - Hash does not contain cexplorer link until transaction is confirmed
    When I click "Send" button on Tokens page in popup mode
    And I fill bundle 1 with "WalletReceiveSimpleTransaction2E2E" main address with following assets:
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
    And I click on a transaction hash and save hash information
    Then I see 2 opened tab(s)
    When I switch to last window
    Then I see cexplorer url with correct transaction hash
