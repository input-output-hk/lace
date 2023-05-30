export interface StakePoolDetailsProps {
  /**
   * Stake pool ID as a bech32 string
   */
  id: string;
  /**
   * Stake pool's name
   */
  name?: string;
  /**
   * Stake pool's ticker
   */
  ticker?: string;
  /**
   * Stake pool's logo
   */
  logo?: string;
  /**
   * Has the stake pool meet their pledge?
   */
  pledgeMet?: boolean;
  /**
   * Has the stake pool retired?
   */
  retired?: boolean;
  /**
   * Action to be executed when clicking on the item
   */
  onClick?: () => unknown;
}
