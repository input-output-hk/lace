@SendSimpleTransaction-Extended-E2E  @Testnet
Feature: Analytics - Posthog - Sending - Extended View
  
  @LW-7821
  Scenario: Extended-view - Send Analytics - Success Screen - Close drawer - X button
    Given I set up request interception for posthog analytics request(s)
    And I click "Send" button on page header
    Then I validate latest analytics single event "send | send | click"
    When I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    Then I validate latest analytics single event "send | transaction data | review transaction | click"
    And I click "Confirm" button on "Transaction summary" page
    And I validate latest analytics single event "send | transaction summary | confirm | click"
    And I enter correct password and confirm the transaction
    And The Transaction submitted screen is displayed in extended mode
    And I validate latest analytics multiple events:
      | send \| transaction confirmation \| confirm \| click |
      | send \| all done \| view |
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "send | all done | x | click"
    And I validate that 6 analytics event(s) have been sent

  @LW-7822
  Scenario: Extended-view - Send Analytics - Success Screen - Close drawer - Close button
    Given I set up request interception for posthog analytics request(s)
    And I click "Send" button on page header
    Then I validate latest analytics single event "send | send | click"
    When I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    Then I validate latest analytics single event "send | transaction data | review transaction | click"
    And I click "Confirm" button on "Transaction summary" page
    And I validate latest analytics single event "send | transaction summary | confirm | click"
    And I enter correct password and confirm the transaction
    And The Transaction submitted screen is displayed in extended mode
    And I validate latest analytics multiple events:
      | send \| transaction confirmation \| confirm \| click |
      | send \| all done \| view |
    When I click "Close" button on send success drawer
    Then I validate latest analytics single event "send | all done | close | click"
    And I validate that 6 analytics event(s) have been sent

  @LW-7823
  Scenario: Extended-view - Send Analytics - Success Screen - View transaction
    Given I set up request interception for posthog analytics request(s)
    And I click "Send" button on page header
    Then I validate latest analytics single event "send | send | click"
    When I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    Then I validate latest analytics single event "send | transaction data | review transaction | click"
    And I click "Confirm" button on "Transaction summary" page
    And I validate latest analytics single event "send | transaction summary | confirm | click"
    And I enter correct password and confirm the transaction
    And The Transaction submitted screen is displayed in extended mode
    And I validate latest analytics multiple events:
      | send \| transaction confirmation \| confirm \| click |
      | send \| all done \| view |
    And I click "View transaction" button on submitted transaction page
    And I validate latest analytics single event "send | all done | view transaction | click"
    And I validate that 6 analytics event(s) have been sent
