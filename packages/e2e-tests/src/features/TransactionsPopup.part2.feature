@Transactions-Popup
Feature: Transactions - Popup view

  Background:
    Given Wallet is synced

  @LW-10596 @Testnet @Pending @issue=LW-12099
  Scenario Outline: Popup View - transaction list - styling: <styling> applied to tx type: <tx_type>
    Given I am on the Activity page - popup view
    When I scroll to the row with transaction type: <tx_type>
    Then I see <styling> styling for transaction type: <tx_type>
    Examples:
      | tx_type                   | styling            |
      | Sent                      | default - negative |
      | Received                  | green - positive   |
      | Self Transaction          | default - negative |
#      enable rewards type of transaction when it's available
#      | Rewards                   | green - positive   |
      | Delegation                | default - negative |
      | Stake Key De-Registration | green - positive   |
      | Stake Key Registration    | default - negative |

  @LW-10617 @Testnet @Pending @issue=LW-12099
  Scenario Outline: Popup View - transaction list - details of <tx_type> type of transaction
    Given I am on the Activity page - popup view
    When I scroll to the row with transaction type: <tx_type>
    And I click transaction type: <tx_type>
    Then I see <tx_type> transaction details
    Examples:
      | tx_type                   |
      | Sent                      |
      | Received                  |
      | Self Transaction          |
#      enable rewards type of transaction when it's available
#      | Rewards                   |
      | Delegation                |
      | Stake Key De-Registration |
      | Stake Key Registration    |
