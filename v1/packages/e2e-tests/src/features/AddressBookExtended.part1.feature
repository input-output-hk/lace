@AddressBook-extended @Mainnet @Testnet
Feature: Address book - extended view

  Background:
    Given Lace is ready for test

  @LW-4456
  Scenario: Extended-view - Address Book - Empty address book
    Given I don't have any addresses added to my address book in extended mode
    Then I see empty address book

  @LW-4459
  Scenario: Extended-view - Address Book - Addresses list verification
    Given I have 3 addresses in my address book in extended mode
    When I see address count: 3
    Then address list is displayed and each row consists of avatar, name and address

  @LW-4464 @Smoke
  Scenario: Extended-view - Address Book - Add new address "Shelley_manual"
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    And "Save address" button is disabled on "Add new address" drawer
    When I fill address form with "Shelley_manual" name and "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address
    And I click "Save address" button on "Add new address" drawer
    Then I see a toast with text: "Address added"
    And I see address row with name "Shelley_manual" and address "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" on the list in extended mode

  @LW-4464
  Scenario Outline: Extended-view - Address Book - Add new address <wallet_name>
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    And "Save address" button is disabled on "Add new address" drawer
    When I fill address form with "<wallet_name>" name and "<address>" address
    And I click "Save address" button on "Add new address" drawer
    Then I see a toast with text: "Address added"
    And I see address row with name "<wallet_name>" and address "<address>" on the list in extended mode
    Examples:
      | wallet_name          | address                                                                                                            |
      | Byron_manual         | 37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp |
      | Icarus_manual        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf                                              |
      | 12345678901234567890 | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |
      | !@#$%^&*(){}:,./     | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |
      | ęóąśłżźćń_ASDFÓŚ     | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |

  @LW-4465
  Scenario Outline: Extended-view - Address Book - Add new address and display error message for name: <wallet_name> and address: <address>
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    When I fill address form with "<wallet_name>" name and "<address>" address
    Then Contact "<name_error>" name error and "<address_error>" address error are displayed
    And "Save address" button is disabled on "Add new address" drawer
    Examples:
      | wallet_name               | address                                                                  | name_error                       | address_error                       |
      | too_long_name_123456789   | addr_invalid                                                             | Max 20 Characters                | Invalid Cardano address             |
      | name_ok                   | addr_invalid                                                             | empty                            | Invalid Cardano address             |
      | too_long_name_123456789   | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf    | Max 20 Characters                | empty                               |
      | "name followed by space " | "2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf " | Name has unnecessary white space | Address has unnecessary white space |
      | " name preceded by space" | " 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf" | Name has unnecessary white space | Address has unnecessary white space |
