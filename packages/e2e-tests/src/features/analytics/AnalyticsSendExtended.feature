@Analytics-SendSimpleTransaction-Extended-E2E @Analytics @Testnet
Feature: Analytics - Posthog - Sending - Extended View

  Background:
    Given Wallet is synced

  @LW-7821 @LW-9109 @E2E
  Scenario: Analytics - Extended-view - Send - Success Screen - View transaction + internal transaction confirmed + Check custom properties
    Given I set up request interception for posthog analytics request(s)
    And I have 2 addresses with ADA handle in my address book in extended mode
    And I click "Send" button on page header
    Then I validate latest analytics single event "send | send | click"
    When I fill bundle 1 with "WalletAnalyticsReceiveSimpleTransactionE2E" main address with following assets:
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

  @LW-9109 @E2E
  Scenario: Analytics - Extended-view - Send - Dapp Success Screen - View transaction - Transaction confirmed
    Given I de-authorize all DApps in extended mode
    And I open and authorize test DApp with "Only once" setting
    And I set send to wallet address to: "WalletAnalyticsReceiveSimpleTransactionE2E" in test DApp
    And I click "Send ADA" "Run" button in test DApp
    Then I see DApp connector "Confirm transaction" page with all UI elements and with following data in "Transaction Summary" section:
      | -3.00 tADA - FEE |
    And I set up request interception for posthog analytics request(s)
    When I click "Confirm" button on "Confirm transaction" page
    Then I validate latest analytics single event "send | transaction summary | confirm | click"
    And I validate that the "send | transaction summary | confirm | click" event includes property "tx_creation_type" with value "external" in posthog
    And I fill correct password
    When I click "Confirm" button on "Sign transaction" page
    Then I validate latest analytics multiple events:
      | send \| transaction confirmation \| confirm \| click |
      | send \| all done \| view                             |
    And I validate that the "send | transaction confirmation | confirm | click" event includes property "tx_creation_type" with value "external" in posthog
    And I validate that the "send | all done | view" event includes property "tx_creation_type" with value "external" in posthog
    And I click "Close" button on DApp "All done" page
    And I don't see DApp window
    And I switch to window with Lace
    When I navigate to Activity extended page
    And I wait 2000 milliseconds
    And I set up request interception for posthog analytics request(s)
    Then Local storage unconfirmedTransaction contains tx with type: "external"
    When the Sent transaction is displayed with value: "3.00 tADA" and tokens count 1
    Then I validate latest analytics single event "send | transaction confirmed"
    And I validate that the "send | transaction confirmed" event includes property "tx_creation_type" with value "external" in posthog
    And I validate that 1 analytics event(s) have been sent
    And Local storage unconfirmedTransaction is empty

  @LW-10505
  Scenario: Analytics - Send - Dapp Success Screen - View transaction - Transaction Canceled
    Given I de-authorize all DApps in extended mode
    And I open and authorize test DApp with "Only once" setting
    And I set send to wallet address to: "WalletAnalyticsReceiveSimpleTransactionE2E" in test DApp
    And I click "Send ADA" "Run" button in test DApp
    Then I see DApp connector "Confirm transaction" page with all UI elements and with following data in "Transaction Summary" section:
      | -3.00 tADA - FEE |
    And I set up request interception for posthog analytics request(s)
    When I click "Confirm" button on "Confirm transaction" page
    When I click "Cancel" button on "Sign transaction" page
    Then I validate latest analytics single event "send | transaction confirmation | cancel | click"
    And I validate that the "send | transaction confirmation | cancel | click" event includes property "tx_creation_type" with value "external" in posthog

  @LW-9111
  Scenario: Analytics - Extended-view - Outdated unconfirmedTransaction is deleted
    Given I set up request interception for posthog analytics request(s)
    And I set outdated unconfirmedTransaction entry in Local storage with type: "internal"
    And Local storage unconfirmedTransaction contains tx with type: "internal"
    When I refresh the page
    Then Local storage unconfirmedTransaction is empty
    And I validate that 0 analytics event(s) have been sent

  @LW-9111
  Scenario: Analytics - Extended-view - Valid unknown unconfirmedTransaction is not not send and not deleted
    Given I set up request interception for posthog analytics request(s)
    And I set valid unconfirmedTransaction entry in Local storage with type: "external"
    And Local storage unconfirmedTransaction contains tx with type: "external"
    When I refresh the page
    Then Local storage unconfirmedTransaction contains tx with type: "external"
    And I validate that 0 analytics event(s) have been sent
