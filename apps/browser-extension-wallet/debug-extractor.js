// Lace Wallet Debug Information Extractor
// Run this script in the browser console on the staking page
//
// NOTE: Debugging works in both popup AND browser tab view!
// The browser view has been configured to use the local Staking component
// with debugging enabled instead of the @lace/staking package component.

console.log('🔍 LACE WALLET REWARDS DEBUG EXTRACTOR');
console.log('=====================================');
console.log('✅ Debugging enabled for both popup and browser tab views');

// Extract rewards debug info
if (window.rewardsDebugInfo) {
  console.log('\n📊 TOTAL REWARDS DEBUG INFO:');
  console.log('Current Epoch:', window.rewardsDebugInfo.currentEpoch);
  console.log('Raw History Length:', window.rewardsDebugInfo.rawRewardsHistoryLength);
  console.log('Withdrawable Length:', window.rewardsDebugInfo.withdrawableRewardsLength);
  console.log('Rewards Array:', window.rewardsDebugInfo.rewardsArray);
  console.log('Total BigNumber:', window.rewardsDebugInfo.totalBigNumber);
  console.log('Total ADA:', window.rewardsDebugInfo.totalADA);
  console.log('Raw Rewards Sum (lovelace):', window.rewardsDebugInfo.rawRewardsSum);
  console.log('Raw Rewards Sum (ADA):', window.rewardsDebugInfo.rawRewardsSumADA);
  console.log('Excluded Rewards Sum (lovelace):', window.rewardsDebugInfo.excludedRewardsSum);
  console.log('Excluded Rewards Sum (ADA):', window.rewardsDebugInfo.excludedRewardsSumADA);
} else {
  console.log('❌ No rewards debug info available');
}

// Extract last reward debug info
if (window.lastRewardDebugInfo) {
  console.log('\n🎯 LAST REWARD DEBUG INFO:');
  console.log('Raw Value:', window.lastRewardDebugInfo.lastRewardRaw);
  console.log('BigNumber Value:', window.lastRewardDebugInfo.lastRewardBigNumber);
  console.log('ADA Value:', window.lastRewardDebugInfo.lastRewardADA);
  console.log('Epoch:', window.lastRewardDebugInfo.epoch);
} else {
  console.log('❌ No last reward debug info available');
}

// Extract Blockfrost comparison data
if (window.blockfrostComparison) {
  console.log('\n🌐 BLOCKFROST COMPARISON:');
  console.log('Status:', window.blockfrostComparison.status);
  console.log('Stake Address:', window.blockfrostComparison.stakeAddress);
  console.log('Blockfrost rewards_sum (lovelace):', window.blockfrostComparison.blockfrostRewardsSum);
  console.log('Blockfrost rewards_sum (ADA):', window.blockfrostComparison.blockfrostRewardsSumADA);
  console.log('Lace calculated rewards_sum (lovelace):', window.blockfrostComparison.laceRewardsSum);
  console.log('Lace calculated rewards_sum (ADA):', window.blockfrostComparison.laceRewardsSumADA);
  console.log('Difference:', window.blockfrostComparison.difference, 'ADA');
  console.log('Blockfrost controlled_amount (lovelace):', window.blockfrostComparison.blockfrostControlledAmount);
  console.log('Blockfrost controlled_amount (ADA):', window.blockfrostComparison.blockfrostControlledAmountADA);
  console.log('Timestamp:', window.blockfrostComparison.timestamp);

  if (window.blockfrostComparison.error) {
    console.log('❌ Error:', window.blockfrostComparison.error);
  }
} else {
  console.log('\n🌐 BLOCKFROST COMPARISON:');
  console.log('No comparison data available yet');
  console.log('Check console logs for Blockfrost API calls');
}

// Check for any console errors or warnings
console.log('\n⚠️ CONSOLE STATUS:');
console.log('Console logging enabled:', typeof console.log === 'function');
console.log('Debug data available:', !!(window.rewardsDebugInfo || window.lastRewardDebugInfo));

// Export debug data for easy copying
const exportDebugData = () => {
  const debugData = {
    timestamp: new Date().toISOString(),
    rewardsDebugInfo: window.rewardsDebugInfo || null,
    lastRewardDebugInfo: window.lastRewardDebugInfo || null,
    blockfrostComparison: window.blockfrostComparison || null
  };

  console.log('\n📋 EXPORTABLE DEBUG DATA:');
  console.log(JSON.stringify(debugData, null, 2));

  // Copy to clipboard if available
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(JSON.stringify(debugData, null, 2))
      .then(() => console.log('✅ Debug data copied to clipboard'))
      .catch((err) => console.log('❌ Failed to copy to clipboard:', err));
  }
};

// Make export function available globally
window.exportLaceDebugData = exportDebugData;

console.log('\n💡 TIP: Run exportLaceDebugData() to export all debug data');
console.log('=====================================');
