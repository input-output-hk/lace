@Activity-Extended
Feature: Transactions - Extended view

  Background:
    Given Wallet is synced

  @LW-3649 @Testnet @Mainnet
  Scenario: Extended View - Transactions details - Amounts summary shows as many rows as assets sent/received minus 1 (ADA)
    Given I am on the Activity page - extended view
    When click on a transaction
    Then the amounts summary shows as many rows as assets sent or received minus 1 -ADA- in extended mode

  @LW-4879 @Testnet @Mainnet
  Scenario: Extended View - Transactions details - Escape button support
    Given I navigate to Activity extended page
    When I click on a transaction: 1
    Then Transaction details drawer is displayed
    When I press keyboard Escape button
    Then Transaction details drawer is not displayed

  @LW-5892 @Testnet @Mainnet
  Scenario: Extended View - transaction details - Hash contains correct cexplorer link
    And I navigate to Activity extended page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    When I click on a transaction: 1
    And I click on a transaction hash and save hash information
    Then I see 2 opened tab(s)
    When I switch to last window
    Then I see cexplorer url with correct transaction hash

  @LW-9280 @Testnet
  Scenario: Defect LW-9229 - transaction details with high amount of inputs
    When I open wallet: 'ManyInputTransactionDefectWallet' in: extended mode
    And I save tx hash value 'a21a3069e214f34ef32e4797865233f87195b753a4cfbca7bed2ccf4807d98d0'
    And I navigate to Activity extended page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    When the Sent transaction is displayed with value: '25.00 tADA' and tokens count 1
    When I click on a transaction: 1
    Then The Tx details are displayed as 'core.activityDetails.sent' for ADA with value: 24.79 and wallet: 'addr_test1qp7vynpwhsyjsqvyw9n8r4uy3uj5hu2arfy94vynvng6556hhqrnhndmg2pntqazt36v700x6kryqjhe75p58v65v6kszx7h3j' address

  @LW-9914 @Testnet
  Scenario Outline: Extended View - transaction list - styling: <styling> applied to tx type: <tx_type>
    Given I navigate to Activity extended page
    When I scroll to the row with transaction type: <tx_type>
    Then I see <styling> styling for transaction type: <tx_type>
    Examples:
      | tx_type                   | styling            |
      | Sent                      | default - negative |
      | Received                  | green - positive   |
      | Self Transaction          | default - negative |
      | Rewards                   | green - positive   |
      | Delegation                | default - negative |
      | Stake Key De-Registration | green - positive   |
      | Stake Key Registration    | default - negative |

  @LW-10616 @Testnet
  Scenario Outline: Extended View - transaction list - details of <tx_type> type of transaction
    Given I navigate to Activity extended page
    When I scroll to the row with transaction type: <tx_type>
    And I click transaction type: <tx_type>
    Then I see <tx_type> transaction details
    Examples:
      | tx_type                   |
      | Sent                      |
      | Received                  |
      | Self Transaction          |
      | Rewards                   |
      | Delegation                |
      | Stake Key De-Registration |
      | Stake Key Registration    |
