@Tokens-popup
Feature: LW: Tokens tab - popup view

  Background:
    Given Wallet is synced

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

  @LW-10653 @Testnet
  Scenario Outline: Popup View - Search tokens by name, policy id, fingerprint and ticker - <token>
    When I search for token: "<token>"
    Then I see only token with name: "<token_result>"
    Examples:
      | token                                | token_result |
      | Cardano                              | Cardano      |
      | tADA                                 | Cardano      |
      | tHOSKY                               | tHOSKY       |
      | asset15qks69wv4vk7clnhp4lq7x0rpk6vs0 | tHOSKY       |
      | 25561d09e55d60b64525b9cdb3cfbec      | LaceCoin3    |
