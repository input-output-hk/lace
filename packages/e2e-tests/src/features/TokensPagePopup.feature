@Tokens-popup
Feature: LW: Tokens tab - popup view

  Background:
    Given Wallet is synced

  @LW-2343 @Testnet @Mainnet
  Scenario: Tokens title and counter
    When I see Tokens counter with total number of tokens displayed
    Then Tokens counter matches the number of wallet tokens

  @LW-2344 @Testnet @Mainnet
  Scenario: Tokens total wallet balance
    Then I see total wallet balance in USD

  @LW-2535 @Testnet @Mainnet
  Scenario: Receive & Send buttons displayed
    Then I see Receive & Send buttons on Tokens page in popup mode

  @LW-2346 @Testnet
  Scenario: Tokens list
    Then I see Cardano & LaceCoin tokens on the list with all the details in popup mode

  @LW-2346 @Mainnet
  Scenario: Tokens list
    Then I see Cardano & Hosky tokens on the list with all the details in popup mode

  @LW-2347 @Testnet @Mainnet
  Scenario: Receive button click
    When I click "Receive" button on Tokens page in popup mode
    Then I see "Wallet Address" page in popup mode for wallet "TestAutomationWallet"

  @LW-2348 @Testnet @Mainnet
  Scenario: Send button click
    When I click "Send" button on Tokens page in popup mode
    Then the 'Send' screen is displayed in popup mode

  @LW-2349 @Testnet
  Scenario Outline: "<token_name>" item click
    When I click token with name: "<token_name>"
    Then The Token details screen is displayed for token "<token_name>" with ticker "<token_ticker>" in popup mode
    Examples:
      | token_name | token_ticker |
      | Cardano    | tADA         |
      | LaceCoin   | LaceCoin1    |

  @LW-2349 @Mainnet
  Scenario Outline: "<token_name>" item click
    When I click token with name: "<token_name>"
    Then The Token details screen is displayed for token "<token_name>" with ticker "<token_ticker>" in popup mode
    Examples:
      | token_name  | token_ticker |
      | Cardano     | ADA          |
      | HOSKY Token | HOSKY        |

  @LW-5905 @Testnet @Mainnet
  Scenario: CoinGecko credits - visibility
    Then I see CoinGecko credits

  @LW-5907 @Testnet @Mainnet
  Scenario: CoinGecko credits - redirection
    When I click on "CoinGecko" link
    Then "www.coingecko.com" page is displayed in new tab

  @LW-6878 @Testnet @Mainnet
  Scenario: Popup View - Hide my balance - positive balance - closed eye icon displayed by default
    Then closed eye icon is displayed on Tokens page

  @LW-6884 @Testnet @Mainnet
  Scenario: Popup View - Hide my balance - positive balance - hide/reveal balance
    When I click closed eye icon on Tokens page
    Then opened eye icon is displayed on Tokens page
    And total wallet balance is masked with asterisks
    And balance and FIAT balance for each token are masked with asterisks
    When I click opened eye icon on Tokens page
    Then closed eye icon is displayed on Tokens page
    And I see total wallet balance in USD
    And balance and FIAT balance for each token are visible

  @LW-7122 @LW-7124 @Testnet @Mainnet
  Scenario Outline: Popup View - Hide my balance - keep state after <action> the page
    When I click closed eye icon on Tokens page
    Then opened eye icon is displayed on Tokens page
    And total wallet balance is masked with asterisks
    And balance and FIAT balance for each token are masked with asterisks
    When <step>
    Then opened eye icon is displayed on Tokens page
    And total wallet balance is masked with asterisks
    And balance and FIAT balance for each token are masked with asterisks
    Examples:
      | action     | step               |
      | refreshing | I refresh the page |
    # LW-7706
    # | reopening  | I reopen the page  |

  @LW-7126 @Testnet @Mainnet
  Scenario: Popup View - Hide my balance - keep state after switching to extended view
    When I click closed eye icon on Tokens page
    Then opened eye icon is displayed on Tokens page
    And total wallet balance is masked with asterisks
    And balance and FIAT balance for each token are masked with asterisks
    When I visit Tokens page in extended mode
    Then opened eye icon is displayed on Tokens page
    And total wallet balance is masked with asterisks
    And balance and FIAT balance for each token are masked with asterisks

  @LW-6684 @Testnet @Mainnet @Pending
  @issue=LW-10296
  Scenario: Popup view - Token pricing - Price fetch expired error is displayed when coingecko request fails
    Given ADA fiat price has been fetched
    When I enable network interception to fail request: "https://coingecko.*"
    And I shift back last fiat price fetch time in local storage by 500 seconds
    Then "Price data expired" error is displayed
    When I disable network interception
    Then ADA fiat price has been fetched
    And "Price data expired" error is not displayed

  @LW-10307 @Testnet @Mainnet @Pending
  @issue=LW-10296
  Scenario: Popup view - Token pricing - Price fetch expired error is displayed when coingecko request returns 500
    Given ADA fiat price has been fetched
    When I enable network interception to finish request: "https://coingecko.*" with error 500
    And I shift back last fiat price fetch time in local storage by 500 seconds
    Then "Price data expired" error is displayed
    When I disable network interception
    Then ADA fiat price has been fetched
    And "Price data expired" error is not displayed

  @LW-6682 @Testnet @Mainnet @Pending
  @issue=LW-10296
  Scenario: Popup view - Token pricing - Fiat price unable to fetch error is displayed on failed request
    Given ADA fiat price has been fetched
    When I enable network interception to fail request: "https://coingecko.*"
    And I delete fiat price timestamp from background storage
    Then "Unable to fetch fiat values" error is displayed
    When I disable network interception
    Then ADA fiat price has been fetched
    Then "Unable to fetch fiat values" error is not displayed

  @LW-6683 @Testnet @Mainnet @Pending
  @issue=LW-10296
  Scenario: Popup view - Token pricing - Fiat price unable to fetch error is displayed when coingecko request returns 500
    Given ADA fiat price has been fetched
    When I enable network interception to finish request: "https://coingecko.*" with error 500
    And I delete fiat price timestamp from background storage
    Then "Unable to fetch fiat values" error is displayed
    And I disable network interception
    Then ADA fiat price has been fetched
    Then "Unable to fetch fiat values" error is not displayed
