@VotingCenterPopup @Testnet @Mainnet
Feature: Voting Center - Popup View

  Background:
    Given Lace is ready for test

  @LW-12330 @LW-12332
  Scenario: Popup view - Voting Center - open and redirect to tempo.vote
    When I navigate to Voting popup page
    Then I see "Voting Center" banner
    When I click on "Access tempo.vote" button
    Then New tab with url containing "tempo.vote" is opened
