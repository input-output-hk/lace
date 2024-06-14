@Runner4 @NFTs-Extended @Testnet
Feature: LW-423: NFTs - Extended view

  Background:
    Given Wallet is synced

  @LW-2495 @Smoke @Mainnet
  Scenario: Extended-view - NFTs title and counter
    Given I am on NFTs extended page
    When I see NFTs counter with total number of NFTs displayed
    Then NFTs counter matches the number of wallet NFTs

  @LW-2497 @LW-7237 @Mainnet
  Scenario: Extended-view - Owning NFTs
    Given I am on NFTs extended page
    Then A gallery view showing my NFTs is displayed
    And I see "Create folder" button on NFTs page in extended mode

  @LW-2498 @Mainnet
  Scenario: Extended-view - Information displayed
    Given I am on NFTs extended page
    Then each NFT has name and image displayed

  @LW-2499 @Smoke @Mainnet
  Scenario: Extended-view - Send button click
    And I am on NFTs extended page
    And I left click on the NFT with name "Ibilecoin" on NFTs page
    And I am on a NFT details on the extended view for NFT with name: "Ibilecoin"
    When I click "Send NFT" button on NFT details drawer
    Then the 'Send' screen is displayed in extended mode
    And the NFT is pre-loaded as token to be sent with name: "Ibilecoin"

  @LW-2500 @Mainnet
  Scenario: Extended-view - Send NFT - Password screen
    Given I am on NFTs extended page
    When I'm sending the NFT with name: "Ibilecoin" in extended mode
    Then The password screen is displayed:
      | Title: "Enter wallet" |
      | Input: Password       |
      | Button: "Confirm"     |
      | Button: "Cancel"      |

  @LW-2501 @Mainnet
  Scenario: Extended-view  - Send NFT - User enters invalid password
    Given I am on NFTs extended page
    And I'm sending the NFT with name: "Ibilecoin" in extended mode
    When I enter incorrect password and confirm the transaction
    Then I see "browserView.transaction.send.error.invalidPassword" password error

  @LW-2504 @Mainnet
  Scenario: Extended-view - "More on NFTs" widget
    Given I am on NFTs extended page
    Then I see "More on NFTs" widget with all relevant items

  @LW-2505 @Mainnet
  Scenario Outline: Extended-view - "About your wallet" widget item click - <subtitle>
    Given I am on NFTs extended page
    When I click on a widget item with subtitle: "<subtitle>"
    Then I see a "<type>" article with title "<subtitle>"
    Examples:
      | type     | subtitle                        |
      | Glossary | What are collections?           |
      | FAQ      | How to buy an NFT?              |
      | Video    | Enter the NFT gallery with Lace |

  @LW-4375
  Scenario: Extended-view - NFT without image displayed fallback picture
    Given I am on NFTs extended page
    Then Verify that "NFT LackImage" contains fallback image

  @LW-4375 @Mainnet
  Scenario: Extended-view - NFT with image does not display fallback picture
    Given I am on NFTs extended page
    Then Verify that "Bison Coin" doesn't contain fallback image

  @LW-4746 @Mainnet
  Scenario: Extended-view - NFTs details - Enter and Escape buttons support
    Given I am on NFTs extended page
    And I left click on the NFT with name "Ibilecoin" on NFTs page
    And I am on a NFT details on the extended view for NFT with name: "Ibilecoin"
    And "Send NFT" button is displayed on NFT details drawer
    When I press keyboard Escape button
    Then "Send NFT" button is not displayed on NFT details drawer
    And I left click on the NFT with name "Ibilecoin" on NFTs page
    And I am on a NFT details on the extended view for NFT with name: "Ibilecoin"
    When I press keyboard Enter button
    Then send drawer is displayed with all its components in extended mode
    And "Review transaction" button is displayed on "Send" page
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    When I press keyboard Escape button
    Then a popup asking if you're sure you'd like to close it is displayed

  @LW-10321
  Scenario: Extended-view - Setting up NFT as a wallet profile avatar
    Given I am on NFTs extended page
    And I left click on the NFT with name "LaceNFT" on NFTs page
    And I am on a NFT details on the extended view for NFT with name: "LaceNFT"
    And I save NFT details
    And I click "Set as your wallet avatar" button on NFT details drawer
    When I close the drawer by clicking close button
    Then the NFT is set as a wallet profile avatar
