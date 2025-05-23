@HdWallet-extended @Testnet
Feature: HD wallet - extended view

  Background:
    Given Wallet is synced

  @LW-7550
  Scenario: Tokens - HD wallet assets discovered in Lace
    Then I see total wallet balance in ADA is '10019.03'
    And I see tMin token with the ADA balance of '21'
    When I navigate to NFTs extended page
    Then I see NFT with name: 'DEV 3432' on the NFTs page
    And I see NFT with name: '$rinodino' on the NFTs page

  @LW-7552
  Scenario Outline: Transactions - HD wallet transactions displayed correctly - transaction <txNumber>
    When I navigate to Activity extended page
    Then I can see transaction <txNumber> has type '<txType>' and value '<txValue>'
    Examples:
      | txNumber | txType           | txValue | Notes                             |
      | 1        | Sent             | 17.19   |                                   |
      | 2        | Received         | 16.00   | Was received to not first address |
      | 3        | Received         | 4.00    | Was received to first address     |
      | 6        | Self Transaction | 0.17    | Was send to first address         |
      | 8        | Self Transaction | 0.17    | Was send to not first address     |
