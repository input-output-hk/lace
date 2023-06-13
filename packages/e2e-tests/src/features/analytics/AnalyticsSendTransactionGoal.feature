@SendSimpleTransaction-Extended-E2E @Testnet
Feature: Analytics

  Background:
    Given Wallet is synced

  @LW-6824
  Scenario: Extended View - Send transaction goal event analytics
    And I set up request interception for 5 matomo analytics request(s)
    When I click "Send" button on page header
    Then I validate latest analytics request(s) information:
      | Event Category   | Event Action | Event Name             |
      | send-transaction | click-event  | send-tx-button-browser |
    When I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    Then I validate latest analytics request(s) information:
      | Event Category   | Event Action | Event Name                |
      | send-transaction | click-event  | review-tx-details-browser |
    When I click "Confirm" button on "Transaction summary" page
    Then I validate latest analytics request(s) information:
      | Event Category   | Event Action | Event Name                 |
      | send-transaction | click-event  | confirm-tx-details-browser |
    When I fill correct password and confirm
    Then I validate latest analytics request(s) information:
      | Event Category   | Event Action | Event Name                |
      | send-transaction | click-event  | input-tx-password-browser |
      | send-transaction | click-event  | tx-success-browser        |
    And I validate existence and number of expected analytics request(s)



