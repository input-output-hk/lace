@SendSimpleTransaction-Extended-E2E @Testnet
Feature: Send Simple Transactions - Extended view - E2E

  Background:
    Given Wallet is synced

  @LW-2375
  Scenario: Extended-view - Send ADA (single asset) E2E
    And I save token: "Cardano" balance
    And I click "Send" button on page header
    And I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    And I save fee value
    And I click "Confirm" button on "Transaction summary" page
    And I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in extended mode
    When I close the drawer by clicking close button
    And I navigate to Tokens extended page
    Then the sent amount of: "1.123" with "saved" fee for token "Cardano" is subtracted from the total balance
    When I navigate to Transactions extended page
    Then the Sent transaction is displayed with value: "1.12 tADA" and tokens count 1
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "package.core.activityDetails.sent" for ADA with value: 1.12 and wallet: "WalletReceiveSimpleTransactionE2E" address
    When I open wallet: "WalletReceiveSimpleTransactionE2E" in: extended mode
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with value: "1.12 tADA" and tokens count 1
    And I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as "package.core.activityDetails.received" for ADA with value: 1.12 and wallet: "WalletSendSimpleTransactionE2E" address

  @LW-4677
  Scenario: Extended-view - Self Transaction E2E
    And I click "Receive" button on page header
    And I click "Copy" button on "Receive" page for default wallet address
    Then I see a toast with message: "core.infoWallet.addressCopied"
    And I close the drawer by clicking close button
    And I click "Send" button on page header
    And I fill bundle 1 with "CopiedAddress" address with following assets:
      | type | assetName | amount |
      | ADA  | tADA      | 5      |
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in extended mode
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
    And I enter correct password and confirm the transaction
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

  @LW-7821 @LW-9109 @Analytics
  Scenario: Analytics - Extended-view - Send - Success Screen - View transaction + internal transaction confirmed + Check custom properties
    Given I set up request interception for posthog analytics request(s)
    And I have 2 addresses with ADA handle in my address book in extended mode
    And I click "Send" button on page header
    Then I validate latest analytics single event "send | send | click"
    When I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    When I click "Add bundle" button on "Send" page
    And I enter "$test_handle_1" in the bundle 2 recipient's address
    And Green tick icon is displayed next to ADA handle
    And I enter a value of: 1 to the "tADA" asset in bundle 2
    And I click "Review transaction" button on "Send" page
    Then I validate latest analytics single event "send | transaction data | review transaction | click"
    And I click "Confirm" button on "Transaction summary" page
    And I validate latest analytics single event "send | transaction summary | confirm | click"
    And I enter correct password and confirm the transaction
    And The Transaction submitted screen is displayed in extended mode
    And I validate latest analytics multiple events:
      | send \| transaction confirmation \| confirm \| click |
      | send \| all done \| view                             |
    And I validate that the "send | all done | view" event includes property "recipient_source" with value "not on address book,address book" in posthog
    And I click "View transaction" button on submitted transaction page
    And Local storage unconfirmedTransaction contains tx with type: "internal"
    And I validate latest analytics single event "send | all done | view transaction | click"
    When the Sent transaction is displayed with value: "2.12 tADA" and tokens count 1
    Then I validate latest analytics single event "send | transaction confirmed"
    And I validate that the "send | transaction confirmed" event includes property "tx_creation_type" with value "internal" in posthog
    And I validate that 7 analytics event(s) have been sent
    And Local storage unconfirmedTransaction is empty

  @LW-9109 @Analytics
  Scenario: Analytics - Extended-view - Send - Dapp Success Screen - View transaction - Transaction confirmed
    Given I de-authorize all DApps in extended mode
    And I open and authorize test DApp with "Only once" setting
    And I click "Send ADA" "Run" button in test DApp
    And I see DApp connector "Confirm transaction" page with: "3.00 ADA", "0" assets and receiving wallet "WalletReceiveSimpleTransactionE2E"
    And I set up request interception for posthog analytics request(s)
    When I click "Confirm" button on "Confirm transaction" page
    Then I validate latest analytics single event "send | transaction summary | confirm | click"
    And I validate that the "send | transaction summary | confirm | click" event includes property "tx_creation_type" with value "external" in posthog
    And I fill correct password
    When I click "Confirm" button on "Sign transaction" page
    Then I validate latest analytics multiple events:
      | send \| transaction confirmation \| confirm \| click |
      | send \| all done \| view                     |
    And I validate that the "send | transaction confirmation | confirm | click" event includes property "tx_creation_type" with value "external" in posthog
    And I validate that the "send | all done | view" event includes property "tx_creation_type" with value "external" in posthog
    And I click "Close" button on DApp "All done" page
    And I don't see DApp window
    And I switch to window with Lace
    When I navigate to Transactions extended page
    And I wait 2000 milliseconds
    And I set up request interception for posthog analytics request(s)
    Then Local storage unconfirmedTransaction contains tx with type: "external"
    When the Sent transaction is displayed with value: "3.00 tADA" and tokens count 1
    Then I validate latest analytics single event "send | transaction confirmed"
    And I validate that the "send | transaction confirmed" event includes property "tx_creation_type" with value "external" in posthog
    And I validate that 1 analytics event(s) have been sent
    And Local storage unconfirmedTransaction is empty

  @LW-9111 @Analytics
  Scenario: Analytics - Extended-view - Outdated unconfirmedTransaction is deleted
    Given I set up request interception for posthog analytics request(s)
    And I set outdated unconfirmedTransaction entry in Local storage with type: "internal"
    And Local storage unconfirmedTransaction contains tx with type: "internal"
    When I refresh the page
    Then Local storage unconfirmedTransaction is empty
    And I validate that 0 analytics event(s) have been sent

  @LW-9111 @Analytics
  Scenario: Analytics - Extended-view - Valid unknown unconfirmedTransaction is not not send and not deleted
    Given I set up request interception for posthog analytics request(s)
    And I set valid unconfirmedTransaction entry in Local storage with type: "external"
    And Local storage unconfirmedTransaction contains tx with type: "external"
    When I refresh the page
    Then Local storage unconfirmedTransaction contains tx with type: "external"
    And I validate that 0 analytics event(s) have been sent
