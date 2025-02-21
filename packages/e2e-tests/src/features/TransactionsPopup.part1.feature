@Activity-Popup
Feature: Transactions - Popup view

  Background:
    Given Wallet is synced

  @LW-2540 @Testnet @Mainnet
  Scenario: Popup View - Activity page
    When I navigate to Activity popup page
    Then Activity page is displayed

  @LW-2543 @LW-2544 @Testnet
  Scenario: Popup View - Activity page - transactions are loaded and skeleton disappears
    When I navigate to Activity popup page
    And Activity page is displayed
    And I save number of visible rows
    And I scroll to the last row
    And a skeleton is not displayed at the bottom of the page
    And more transactions are loaded

  @LW-2542 @Testnet
  Scenario: Popup View - Infinite scroll
    When I navigate to Activity popup page
    And Activity page is displayed
    And I save number of visible rows
    And I scroll to the last visible row on Activity page
    Then a skeleton is displayed at the bottom of the page

  @LW-2545 @Testnet
  Scenario: Popup View - Transactions are grouped
    When I navigate to Activity popup page
    Then all transactions are grouped by date

  @LW-2546 @Testnet @Mainnet
  Scenario: Popup View - Transactions are show relevant info
    When I navigate to Activity popup page
    Then all transactions have icon, type of transaction, amount of tokens, value, and value in FIAT

  @LW-2547 @Testnet @Mainnet
  Scenario: Popup View - Transactions details - Folded
    Given I am on the Activity page - popup view
    When click on a transaction
    Then a side drawer is displayed showing the following information in popup mode
      | Title                   |
      | Tx Hash                 |
      | Status                  |
      | Timestamp               |
      | Folded input section    |
      | Folded output section   |
      | Transaction fee in ADA  |
      | Transaction fee in FIAT |

  @LW-2548 @Testnet @Mainnet
  Scenario: Popup View - Transactions details - Unfolded
    Given I am on the Activity page - popup view
    When I click on a transaction and click on both dropdowns
    Then all inputs and outputs of the transactions are displayed in popup mode

  @LW-2549 @Testnet @Mainnet
  Scenario: Popup View - Transactions - No value is zero
    Given I am on the Activity page - popup view
    When I navigate to Activity popup page
    Then all the transactions have a value other than zero

  @LW-2550 @Testnet @Mainnet
  Scenario: Popup View - Transactions details - No value is zero
    Given I am on the Activity page - popup view
    When I click on a transaction and click on both dropdowns
    Then none of the input and output values is zero in popup mode

  @LW-3650 @Testnet @Mainnet
  Scenario: Popup View - Transactions details - Summary section is displayed
    Given I am on the Activity page - popup view
    When click on a transaction
    Then the amounts sent or received are displayed below the Tx hash in popup mode
    And the Sender or Receiver is displayed

  @LW-3651 @Testnet @Mainnet
  Scenario: Popup View - Transactions details - Amounts summary shows as many rows as assets sent/received minus 1 (ADA)
    Given I am on the Activity page - popup view
    When click on a transaction
    Then the amounts summary shows as many rows as assets sent or received minus 1 -ADA- in popup mode

  @LW-5893 @Testnet @Mainnet
  Scenario: Popup View - transaction details - Hash contains correct cexplorer link
    And I navigate to Activity popup page
    And I wait for the transaction history to be loaded and all transactions to be confirmed
    When I click on a transaction: 1
    And I click on a transaction hash and save hash information
    Then I see 2 opened tab(s)
    When I switch to last window
    Then I see cexplorer url with correct transaction hash
