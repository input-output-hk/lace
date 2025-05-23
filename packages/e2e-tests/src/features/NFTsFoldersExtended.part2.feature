@NFT-Folders-Extended @Testnet
Feature: NFT - Folders - Extended view

  Background:
    Given Wallet is synced
    And all NFT folders are removed

  @LW-7247
  Scenario: Extended-view - NFT Folders - Trying to create folder using too long name
    Given I navigate to NFTs extended page
    And I click 'Create folder' button on NFTs page
    And I see 'Create NFT folder' page in extended mode
    And 'Folder name' input is empty on 'Name your folder' page
    And 'Next' button is disabled on 'Name your folder' page
    When I enter a folder name '012345678901234567890' into 'Folder name' input
    Then I see 'Folder name' input max length 20 error
    And 'Next' button is disabled on 'Name your folder' page
    When I clear 'Folder name' input
    And I enter a folder name '01234567890123456789' into 'Folder name' input
    Then I don't see 'Folder name' input max length 20 error
    And 'Next' button is enabled on 'Name your folder' page

  @LW-7248
  Scenario: Extended-view - NFT Folders - Trying to create folder using name that already exists
    Given the NFT folder with name 'NFT folder 1' and 1 NFT was created
    And I navigate to NFTs extended page
    And I click 'Create folder' button on NFTs page
    When I enter a folder name 'NFT folder 1' into 'Folder name' input
    Then I see 'Given name already exists' error on 'Name your folder' page
    And 'Next' button is disabled on 'Name your folder' page
    When I clear 'Folder name' input
    And I enter a folder name 'NFT folder 2' into 'Folder name' input
    Then I do not see 'Given name already exists' error on 'Name your folder' page
    And 'Next' button is enabled on 'Name your folder' page

  @LW-7249
  Scenario: Extended-view - NFT Folders - Creating a folder happy path
    Given I navigate to NFTs extended page
    And I click 'Create folder' button on NFTs page
    And I enter a folder name 'Sample NFT folder' into 'Folder name' input
    And I click 'Next' button on 'Name your folder' page
    And I click NFT with name 'Ibilecoin'
    And I click NFT with name 'Bison Coin'
    When I click 'Next' button on 'Select NFTs' page
    Then I see a toast with text: 'Folder created successfully'
    And I do not see 'Select NFTs' page in extended mode
    And I see folder with name 'Sample NFT folder' on the NFTs page
    When I left click on the NFT folder with name 'Sample NFT folder'
    Then I see 'Sample NFT folder' NFT folder page in extended mode
    And I see NFT with name 'Ibilecoin' on the NFT folder page
    And I see NFT with name 'Bison Coin' on the NFT folder page

  @LW-7250 @LW-7251
  Scenario: Extended-view - NFT Folders - Select NFTs page displayed
    Given I navigate to NFTs extended page
    And I save all NFTs that I have
    When I click 'Create folder' button on NFTs page
    When I enter a folder name 'example folder' into 'Folder name' input
    And I click 'Next' button on 'Name your folder' page
    Then I see 'Select NFTs' page in extended mode
    And No NFT is selected
    And 'Select NFTs' page is showing all NFTs that I have
    And 'Next' button is disabled on 'Create folder' page

  @LW-7252
  Scenario: Extended-view - NFT Folders - Select NFTs page - back button click
    Given I navigate to 'Select NFTs' page in extended mode
    When I close the drawer by clicking back button
    Then I see 'Create NFT folder' drawer in extended mode

  @LW-7253
  Scenario Outline: Extended-view - NFT Folders - Select NFTs page - warning modal when <action>
    Given I navigate to 'Select NFTs' page in extended mode
    When <action>
    Then I see 'You'll have to start again' modal
    Examples:
      | action                                      |
      | I close the drawer by clicking close button |
      | I click outside the drawer                  |

  @LW-7256
  Scenario: Extended-view - NFT Folders - Select NFTs page - select and unselect a NFT
    Given I navigate to 'Select NFTs' page in extended mode
    When I click NFT with name 'Ibilecoin'
    Then NFT with name 'Ibilecoin' is selected
    When I click NFT with name 'Ibilecoin'
    Then NFT with name 'Ibilecoin' is not selected

  @LW-7257
  Scenario: Extended-view - NFT Folders - Select NFTs page - search for NFT - no results
    Given I navigate to 'Select NFTs' page in extended mode
    When I enter 'some random phrase' into the search bar on 'Select NFTs' drawer
    Then I see no results for 'Select NFTs' drawer

  @LW-7255
  Scenario: Extended-view - NFT Folders - Select NFTs page - clear button
    Given I navigate to 'Select NFTs' page in extended mode
    And I do not see 'Clear' button next to NFTs counter
    When I select 5 NFTs
    Then I see 'Clear' button next to NFTs counter
    When I click 'Clear' button next to NFTs counter
    Then No NFT is selected

  @LW-7254
  Scenario: Extended-view - NFT Folders - Select NFTs page - selected NFTs counter
    Given I navigate to 'Select NFTs' page in extended mode
    And I do not see NFTs counter
    When I select 5 NFTs
    Then I see NFTs counter showing 5 selected NFTs

  @LW-7258
  Scenario: Extended-view - NFT Folders - Select NFTs page - search for existing NFTs and clear
    Given I navigate to 'Select NFTs' page in extended mode
    And I save all NFTs that I have
    When I enter 'coin' into the search bar
    Then I see NFTs containing 'coin' on the 'Select NFTs' page
    When I press 'Clear' button in search bar
    And 'Select NFTs' page is showing all NFTs that I have

  @LW-7184
  Scenario: Extended-view - NFT Folders - 'Add NFT' button availability and click within the NFT folder
    Given the NFT folder with name 'Sample NFT folder' and 1 NFT was created
    And I navigate to NFTs extended page
    And I save all NFTs that I have
    When I left click on the NFT folder with name 'Sample NFT folder'
    Then I can see 'Add NFT' button active
    When I click 'Add NFT' button within the NFT folder
    Then 'Select NFTs' page is showing all NFTs that I have

  @LW-7185
  Scenario: Extended-view - NFT Folders - Adding NFTs to existing folder
    Given the NFT folder with name 'Sample NFT folder' and 1 NFT was created
    And I navigate to NFTs extended page
    When I left click on the NFT folder with name 'Sample NFT folder'
    And I can see 'Add NFT' button active
    And I click 'Add NFT' button within the NFT folder
    And I click NFT with name 'Ibilecoin'
    And I click NFT with name 'Bison Coin'
    When I click 'Add selected NFTs' button on 'Select NFTs' page
    Then I see a toast with text: 'NFTs added to folder'
    And I see 'Sample NFT folder' NFT folder page in extended mode
    And I see NFT with name 'Ibilecoin' on the NFT folder page
    And I see NFT with name 'Bison Coin' on the NFT folder page

  @LW-7187
  Scenario Outline: Extended-view - NFT Folders - Context menu with 'Remove from folder' option is displayed: <is_displayed>
    Given the NFT folder with name 'Sample NFT folder' and 1 NFT was created
    And I navigate to NFTs extended page
    And I left click on the NFT folder with name 'Sample NFT folder'
    And I see 'Sample NFT folder' NFT folder page in extended mode
    When I <action> on the NFT folder page
    Then NFT context menu with 'Remove' option <is_displayed> displayed
    Examples:
      | action                                     | is_displayed |
      | right click on the NFT with name 'LaceNFT' | is           |
      | right click on the add NFT button          | is not       |

  @LW-7188
  Scenario: Extended-view - NFT Folders - Closing context menu with 'Remove from folder' option
    Given the NFT folder with name 'Sample NFT folder' and 1 NFT was created
    And I navigate to NFTs extended page
    And I left click on the NFT folder with name 'Sample NFT folder'
    And I see 'Sample NFT folder' NFT folder page in extended mode
    When I right click on the NFT with name 'LaceNFT' on the NFT folder page
    Then NFT context menu with 'Remove' option is displayed
    When I click outside the NFT folder context menu
    Then NFT context menu with 'Remove' option is not displayed

  @LW-7189
  Scenario: Extended-view - NFT Folders - Removing NFTs from existing folder
    Given the NFT folder with name 'Sample NFT folder' and 2 NFT was created
    And I navigate to NFTs extended page
    And I do not see NFT with name: 'LaceNFT' on the NFTs page
    And I do not see NFT with name: 'Ibilecoin' on the NFTs page
    And I left click on the NFT folder with name 'Sample NFT folder'
    And I see 'Sample NFT folder' NFT folder page in extended mode
    And I see NFT with name 'Ibilecoin' on the NFT folder page
    And I see NFT with name 'LaceNFT' on the NFT folder page
    And I right click on the NFT with name 'LaceNFT' on the NFT folder page
    When I click 'Remove from folder' option in NFT context menu
    Then I see a toast with text: 'NFT removed'
    And I see NFT with name 'Ibilecoin' on the NFT folder page
    And I do not see NFT with name 'LaceNFT' on the NFT folder page
    And I close the drawer by clicking close button
    And I see NFT with name: 'LaceNFT' on the NFTs page
    And I do not see NFT with name: 'Ibilecoin' on the NFTs page
