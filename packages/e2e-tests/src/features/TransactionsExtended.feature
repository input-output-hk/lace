@Transactions-Extended
Feature: Transactions - Extended view

  Background:
    Given Wallet is synced

  @LW-2551 @Smoke @Testnet @Mainnet
  Scenario: Extended View - Transactions tab
    When I navigate to Transactions extended page
    Then Transactions section is displayed

  @LW-2552 @LW-2556 @LW-2555 @Testnet
  Scenario: Extended View - Transactions tab - Counter matches the number of rows, transactions are loaded and skeleton disappears
    When I navigate to Transactions extended page
    And Transactions section is displayed
    And I save number of visible rows
    And I scroll to the last row
    Then a transactions counter that sums up to the total number of all transactions is displayed
    And a skeleton is not displayed at the bottom of the page
    And more transactions are loaded

  @LW-2253 @Testnet @Mainnet
  Scenario: Extended View - Transactions tab - No value is zero
    When I navigate to Transactions extended page
    Then all the transactions have a value other than zero

  @LW-2554 @Testnet
  Scenario: Extended View - Infinite scroll
    When I navigate to Transactions extended page
    And Transactions section is displayed
    And I scroll to the row: 8
    Then a skeleton is displayed at the bottom of the page

  @LW-2557 @Testnet
  Scenario: Extended View - Transactions are grouped
    When I navigate to Transactions extended page
    Then all transactions are grouped by date

  @LW-2558 @Smoke @Testnet @Mainnet
  Scenario: Extended View - Transactions show relevant info
    When I navigate to Transactions extended page
    Then all transactions have icon, type of transaction, amount of tokens, value, and value in FIAT

  @LW-2559 @Smoke @Testnet @Mainnet
  Scenario: Extended View - Transactions details - Folded
    Given I am on the Transactions section - Extended view
    When click on a transaction
    Then a side drawer is displayed showing the following information in extended mode
      | Title                   |
      | Tx Hash                 |
      | Status                  |
      | Timestamp               |
      | Folded input section    |
      | Folded output section   |
      | Transaction fee in ADA  |
      | Transaction fee in FIAT |

  @LW-2560 @Testnet @Mainnet
  Scenario: Extended View - Transactions details - Unfolded
    Given I am on the Transactions section - Extended view
    When I click on a transaction and click on both dropdowns
    Then all inputs and outputs of the transactions are displayed in extended mode

  @LW-2561 @Testnet @Mainnet
  Scenario: Extended View - Transactions details - No value is zero
    Given I am on the Transactions section - Extended view
    When I click on a transaction and click on both dropdowns
    Then none of the input and output values is zero in extended mode

  @LW-2562 @Testnet @Mainnet
  Scenario: Extended View - Transactions section - Educational banner
    When I navigate to Transactions extended page
    Then I see Transactions "Learn about" widget with all relevant items

  @LW-2562 @Testnet @Mainnet
  Scenario Outline: Extended View - "Learn about" widget item click - <subtitle>
    Given I am on Transactions extended page
    When I click on a widget item with subtitle: "<subtitle>"
    Then I see a "<type>" article with title "<subtitle>"
    Examples:
      | type     | subtitle                            |
      | Glossary | What are activity details?          |
      | Glossary | What is an unconfirmed transaction? |
      | FAQ      | Does Lace have fees?                |
      | Video    | Transaction bundles                 |

  @LW-3648 @Testnet @Mainnet
  Scenario: Extended View - Transactions details - Summary section is displayed
    Given I am on the Transactions section - Extended view
    When click on a transaction
    Then the amounts sent or received are displayed below the Tx hash in extended mode
    And the Sender or Receiver is displayed

  @LW-3649 @Testnet @Mainnet
  Scenario: Extended View - Transactions details - Amounts summary shows as many rows as assets sent/received minus 1 (ADA)
    Given I am on the Transactions section - Extended view
    When click on a transaction
    Then the amounts summary shows as many rows as assets sent or received minus 1 -ADA- in extended mode

  @LW-4879 @Testnet @Mainnet
  Scenario: Extended View - Transactions details - Escape button support
    Given I am on Transactions extended page
    When I click on a transaction: 1
    Then Transaction details drawer is displayed
    When I press keyboard Escape button
    Then Transaction details drawer is not displayed

  @LW-5892 @Testnet @Mainnet
  Scenario: Extended View - transaction details - Hash contains correct cexplorer link
    And I am on Transactions extended page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    When I click on a transaction: 1
    And I click on a transaction hash and save hash information
    Then I see 2 opened tab(s)
    When I switch to last window
    Then I see cexplorer url with correct transaction hash

  @LW-9280 @Testnet
  Scenario: Defect LW-9229 - transaction details with high amount of inputs
    When I open wallet: "ManyInputTransactionDefectWallet" in: extended mode
    And I save tx hash value "a21a3069e214f34ef32e4797865233f87195b753a4cfbca7bed2ccf4807d98d0"
    And I am on Transactions extended page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    When the Sent transaction is displayed with value: "24.79 tADA" and tokens count 1
    When I click on a transaction: 1
    Then The Tx details are displayed as "core.activityDetails.sent" for ADA with value: 24.79 and wallet: "WalletReceiveSimpleTransactionE2E" address

  @LW-9914 @Testnet
  Scenario Outline: Extended View - transaction list - styling: <styling> applied to tx type: <tx_type>
    Given I am on Transactions extended page
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
