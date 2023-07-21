@NFT-Folders-Extended @Testnet
Feature: NFT - Folders - Extended view

  Background:
    Given Wallet is synced

  @LW-7242
  Scenario: Extended-view - NFT Folders - "Create folder" button click
    Given I navigate to NFTs extended page
    When I click "Create folder" button on NFTs page
    Then I see "Create NFT folder" page in extended mode
    And "Folder name" input is empty on "Name your folder" page
    And "Next" button is disabled on "Name your folder" page

  @LW-7243
  Scenario: Extended-view - NFT Folders - "Create NFT folder" page "Next" button enabled when name input is not empty
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    When I enter a folder name "example folder" into "Folder name" input
    Then "Next" button is enabled on "Name your folder" page

  @LW-7250 @LW-7251
  Scenario: Extended-view - NFT Folders - Select NFTs page displayed
    Given I navigate to NFTs extended page
    And I save all NFTs that I have
    When I click "Create folder" button on NFTs page
    When I enter a folder name "example folder" into "Folder name" input
    And I click "Next" button on "Name your folder" page
    Then I see "Select NFTs" page in extended mode
    And No NFT is selected
    And "Select NFTs" page is showing all NFTs that I have
    And "Next" button is disabled on "Create folder" page

  @LW-7247
  Scenario: Extended-view - NFT Folders - Trying to create folder using too long name
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    And I see "Create NFT folder" page in extended mode
    And "Folder name" input is empty on "Name your folder" page
    And "Next" button is disabled on "Name your folder" page
    When I enter a folder name "012345678901234567890" into "Folder name" input
    Then I see "Folder name" input max length 20 error
    And "Next" button is disabled on "Name your folder" page
    When I clear "Folder name" input
    And I enter a folder name "01234567890123456789" into "Folder name" input
    Then I don't see "Folder name" input max length 20 error
    And "Next" button is enabled on "Name your folder" page

  @LW-7244
  Scenario Outline: Extended-view - NFT Folders - "Create folder" flow and warning modal when <action>
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    When <action>
    Then I see "You'll have to start again" modal
    Examples:
      | action                                      |
      | I close the drawer by clicking close button |
      | I click outside the drawer                  |

  @LW-7245
  Scenario: Extended-view - NFT Folders - "Create folder" flow and warning modal cancellation
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    And I see "Create NFT folder" drawer in extended mode
    And I close the drawer by clicking close button
    When I click "Cancel" button on "You'll have to start again" modal for create NFTs folder
    Then I don't see "You'll have to start again" modal
    And I see "Create NFT folder" drawer in extended mode

  @LW-7246
  Scenario: Extended-view - NFT Folders - "Create folder" flow and warning modal confirmation
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    And I see "Create NFT folder" drawer in extended mode
    And I close the drawer by clicking close button
    When I click "Agree" button on "You'll have to start again" modal for create NFTs folder
    Then I don't see "You'll have to start again" modal
    And I don't see "Create NFT folder" drawer in extended mode
    And A gallery view showing my NFTs is displayed

  @LW-7252
  Scenario: Extended-view - NFT Folders - Select NFTs page - back button click
    Given I navigate to "Select NFTs" page in extended mode
    When I close the drawer by clicking back button
    Then I see "Create NFT folder" drawer in extended mode

  @LW-7253
  Scenario Outline: Extended-view - NFT Folders - Select NFTs page - warning modal when <action>
    Given I navigate to "Select NFTs" page in extended mode
    When <action>
    Then I see "You'll have to start again" modal
    Examples:
      | action                                      |
      | I close the drawer by clicking close button |
      | I click outside the drawer                  |

  @LW-7256
  Scenario: Extended-view - NFT Folders - Select NFTs page - select and unselect a NFT
    Given I navigate to "Select NFTs" page in extended mode
    When I click NFT with name "Ibilecoin"
    Then NFT with name "Ibilecoin" is selected
    When I click NFT with name "Ibilecoin"
    Then NFT with name "Ibilecoin" is not selected

  @LW-7257
  Scenario: Extended-view - NFT Folders - Select NFTs page - search for NFT - no results
    Given I navigate to "Select NFTs" page in extended mode
    When I enter "some random phrase" into the search bar on "Select NFTs" drawer
    Then I see no results for "Select NFTs" drawer

  @LW-7249
  Scenario: Extended-view - NFT Folders - Creating a folder happy path
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    And I enter a folder name "Sample NFT folder" into "Folder name" input
    And I click "Next" button on "Name your folder" page
    And I click NFT with name "Ibilecoin"
    And I click NFT with name "Bison Coin"
    When I click "Next" button on "Select NFTs" page
    Then I see a toast with text: "Folder created successfully"
    And I do not see "Select NFTs" page in extended mode
    And I see folder with name "Sample NFT folder" on the NFTs list
    When I click the NFT folder with name "Sample NFT folder"
    Then I see "Sample NFT folder" NFT folder page in extended mode
    And I see NFT with name "Ibilecoin" on the NFT folder page
    And I see NFT with name "Bison Coin" on the NFT folder page

  @LW-7255
  Scenario: Extended-view - NFT Folders - Select NFTs page - clear button
    Given I navigate to "Select NFTs" page in extended mode
    And I do not see "Clear" button next to NFTs counter
    When I select 5 NFTs
    Then I see "Clear" button next to NFTs counter
    When I click "Clear" button next to NFTs counter
    Then No NFT is selected

  @LW-7254
  Scenario: Extended-view - NFT Folders - Select NFTs page - selected NFTs counter
    Given I navigate to "Select NFTs" page in extended mode
    And I do not see NFTs counter
    When I select 5 NFTs
    Then I see NFTs counter showing 5 selected NFTs

  @LW-7258
  Scenario: Extended-view - NFT Folders - Select NFTs page - search for existing NFTs and clear
    Given I navigate to "Select NFTs" page in extended mode
    And I save all NFTs that I have
    When I enter "coin" into the search bar
    Then I see NFTs containing "coin" on the "Select NFTs" page
    When I press "Clear" button in search bar
    And "Select NFTs" page is showing all NFTs that I have
