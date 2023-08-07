@SendSimpleTransaction-Popup-E2E @Testnet
Feature: Analytics - Posthog - Sending - Popup View

  Background:
    Given Wallet is synced

  @LW-7828
  Scenario: Popup-view - Send Analytics - Success Screen - Close drawer - X button
    Given I set up request interception for posthog analytics request(s)
    And I save token: "Cardano" balance
    And I click "Send" button on Tokens page in popup mode
    Then I validate latest analytics single event "send | send | click"
    And I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
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
      | send \| all done \| view |
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "send | all done | x | click"
    And I validate that 6 analytics event(s) have been sent

  @LW-7829
  Scenario: Popup-view - Send Analytics - Success Screen - Close drawer - Close button
    Given I set up request interception for posthog analytics request(s)
    And I save token: "Cardano" balance
    And I click "Send" button on Tokens page in popup mode
    Then I validate latest analytics single event "send | send | click"
    And I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
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
      | send \| all done \| view |
    When I click "Close" button on send success drawer
    Then I validate latest analytics single event "send | all done | close | click"
    And I validate that 6 analytics event(s) have been sent

  @LW-7830
  Scenario: Popup-view - Send Analytics - Success Screen - View transaction
    Given I set up request interception for posthog analytics request(s)
    And I save token: "Cardano" balance
    And I click "Send" button on Tokens page in popup mode
    Then I validate latest analytics single event "send | send | click"
    And I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
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
      | send \| all done \| view |
    And I click "View transaction" button on submitted transaction page
    And I validate latest analytics single event "send | all done | view transaction | click"
    And I validate that 6 analytics event(s) have been sent
