@Analytics-SendSimpleTransaction-Popup-E2E @Analytics @Testnet
Feature: Analytics - Posthog - Sending - Popup View

  Background:
    Given Wallet is synced

  @LW-7828 @LW-9109 @E2E
  Scenario: Analytics - Popup-view - Send - Success Screen - View transaction
    Given I set up request interception for posthog analytics request(s)
    And I save token: "Cardano" balance
    And I click "Send" button on Tokens page in popup mode
    Then I validate latest analytics single event "send | send | click"
    And I fill bundle 1 with "WalletAnalyticsReceiveSimpleTransaction2E2E" address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    Then I validate latest analytics single event "send | transaction data | review transaction | click"
    And I click "Confirm" button on "Transaction summary" page
    And I validate latest analytics single event "send | transaction summary | confirm | click"
    When I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in popup mode
    And I validate latest analytics multiple events:
      | send \| transaction confirmation \| confirm \| click |
      | send \| all done \| view                             |
    And I click "View transaction" button on submitted transaction page
    And Local storage unconfirmedTransaction contains tx with type: "internal"
    And I validate latest analytics single event "send | all done | view transaction | click"
    When the Sent transaction is displayed with value: "1.12 tADA" and tokens count 1
    Then I validate latest analytics single event "send | transaction confirmed"
    And I validate that the "send | transaction confirmed" event includes property "tx_creation_type" with value "internal" in posthog
    And I validate that 7 analytics event(s) have been sent
    And Local storage unconfirmedTransaction is empty
