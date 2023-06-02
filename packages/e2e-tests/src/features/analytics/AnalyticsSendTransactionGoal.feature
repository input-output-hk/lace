@SendSimpleTransaction-Extended-E2E @Testnet
Feature: Analytics

  Background:
    Given Wallet is synced

  @wip
  Scenario: Extended View - Send transaction goal event analytics
    And I set up request interception for 5 matomo analytics request(s)
    And I click "Send" button on page header
    And I validate latest analytics request(s) information:
      | Event Category   | Event Action | Event Name             |
      | send-transaction | click-event  | send-tx-button-browser |
    And I fill bundle 1 with "WalletReceiveSimpleTransactionE2E" address with following assets:
      | type | assetName | ticker | amount |
      | ADA  | Cardano   | tADA   | 1.1234 |
    And I click "Review transaction" button on "Send" page
    And I validate latest analytics request(s) information:
      | Event Category   | Event Action | Event Name                |
      | send-transaction | click-event  | review-tx-details-browser |
    And I click "Confirm" button on "Transaction summary" page
    And I validate latest analytics request(s) information:
      | Event Category   | Event Action | Event Name                 |
      | send-transaction | click-event  | confirm-tx-details-browser |
    And I fill correct password and confirm
    And I validate latest analytics request(s) information:
      | Event Category   | Event Action | Event Name                |
      | send-transaction | click-event  | input-tx-password-browser |
      | send-transaction | click-event  | tx-success-browser        |
    Then I validate existence and number of expected analytics request(s)



