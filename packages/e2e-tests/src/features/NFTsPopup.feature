@NFTs-Popup @Testnet
Feature: LW-411 Ext.PopUp - Collectibles/NFTs

  Background:
    Given Wallet is synced

  @LW-2506 @Mainnet
  Scenario: Popup-view - NFTs tab
    Then The bottom menu contains NFT item

  @LW-2507 @Mainnet
  Scenario: Popup-view - NFTs title and counter
    Given I am on NFTs popup page
    When I see NFTs counter with total number of NFTs displayed
    Then NFTs counter matches the number of wallet NFTs

  @LW-2509 @LW-7238 @Mainnet
  Scenario: Popup-view - Owning NFTs
    Given I am on NFTs popup page
    Then A gallery view showing my NFTs is displayed
    And I see "Create folder" button on NFTs page in popup mode

  @LW-2510 @Mainnet
  Scenario: Popup-view - Information displayed
    When I am on NFTs popup page
    Then each NFT has name and image displayed

  @LW-2511 @Mainnet
  Scenario: Popup-view - Send button click
    And I am on NFTs popup page
    And I left click on the NFT with name "Ibilecoin" on NFTs page
    And I am on a NFT details on the popup view for NFT with name: "Ibilecoin"
    When I click "Send NFT" button on NFT details drawer
    Then the 'Send' screen is displayed in popup mode
    And the NFT is pre-loaded as token to be sent with name: "Ibilecoin"

  @LW-2512 @Mainnet
  Scenario: Popup-view - Send NFT - Password screen
    Given I am on NFTs popup page
    When I'm sending the NFT with name: "Ibilecoin" in popup mode
    Then The password screen is displayed:
      | Title: "Enter wallet" |
      | Input: Password       |
      | Button: "Confirm"     |
      | Button: "Cancel"      |

  @LW-2513 @Mainnet
  Scenario: Popup-view - Send NFT - User enters invalid password
    Given I am on NFTs popup page
    And I'm sending the NFT with name: "Ibilecoin" in popup mode
    When I enter incorrect password and confirm the transaction
    Then I see "browserView.transaction.send.error.invalidPassword" password error

  @LW-4373
  Scenario: Popup-view - NFT without image displayed fallback picture
    Given I am on NFTs popup page
    Then Verify that "NFT LackImage" contains fallback image

  @LW-4373 @Mainnet
  Scenario: Popup-view - NFT with image does not display fallback picture
    Given I am on NFTs popup page
    Then Verify that "Bison Coin" doesn't contain fallback image
