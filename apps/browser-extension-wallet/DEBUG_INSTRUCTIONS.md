# Lace Wallet - Rewards Debugging Instructions

## Overview
This version of Lace Wallet includes comprehensive debugging information for investigating rewards calculation discrepancies. The debugging information is accessible through the browser console and stored in global variables for easy inspection.

## How to Use

### 1. Install the Extension
1. Build the application: `DROP_CONSOLE_IN_PRODUCTION=false yarn build`
2. Load the `dist/` folder as an unpacked extension in Chrome/Firefox
3. Navigate to the Staking page

### 2. View Debug Information

#### Console Access (All Views)
Open the browser console (F12) and access:

```javascript
// Total rewards calculation details
window.rewardsDebugInfo

// Last reward calculation details  
window.lastRewardDebugInfo
```

### 3. Use the Debug Extractor Script
For comprehensive debug data extraction, run the provided script in the console:

```javascript
// Copy and paste the contents of debug-extractor.js into the console
// Or run it directly if you have it saved
```

### 4. What to Look For

#### Rewards Calculation Flow
1. **Raw Rewards History**: Check `window.rewardsDebugInfo.rawRewardsHistoryLength`
2. **Epoch Filtering**: Current epoch and which epochs are excluded
3. **Withdrawable Rewards**: Number of rewards after filtering (2-epoch offset)
4. **BigNumber Conversion**: See the exact values being summed
5. **Final ADA Conversion**: Check the division by 1,000,000

#### Enhanced Debug Information
6. **Raw Rewards Sum**: Total of all rewards without filtering (`window.rewardsDebugInfo.rawRewardsSum`)
7. **Raw Rewards Sum (ADA)**: Raw sum converted to ADA (`window.rewardsDebugInfo.rawRewardsSumADA`)
8. **Excluded Rewards Sum**: Sum of rewards excluded by 2-epoch offset (`window.rewardsDebugInfo.excludedRewardsSum`)
9. **Excluded Rewards Sum (ADA)**: Excluded sum converted to ADA (`window.rewardsDebugInfo.excludedRewardsSumADA`)

#### Automated Blockfrost Comparison
10. **Real-time API Calls**: Automatic comparison with Blockfrost's `accounts/stake_address` endpoint
11. **Data Integrity Check**: Direct comparison between Lace's calculated sum and Blockfrost's `rewards_sum`
12. **Stake Address Detection**: Automatically gets stake address from wallet's reward accounts
13. **Instant Validation**: Detects data discrepancies in real-time during rewards calculation

#### Key Debug Points
- **Current Epoch**: What epoch the calculation is based on
- **Epochs Excluded**: Which epochs are being filtered out (LAST_STABLE_EPOCH = 2)
- **Rewards Array**: The exact string values being passed to BigNumber.sum
- **Precision**: Check if any precision is lost during string conversion
- **Type Consistency**: Ensure all values are the expected types
- **Raw vs Filtered**: Compare `rawRewardsSumADA` vs displayed Total Rewards
- **Excluded Amount**: Verify that `excludedRewardsSumADA` explains the difference
- **2-Epoch Offset**: Confirm that excluded rewards match the 2-epoch protocol requirement
- **Blockfrost Comparison**: Check if Lace's calculated sum matches Blockfrost's `rewards_sum`
- **Data Integrity**: Verify that the discrepancy isn't due to missing reward records

### 5. Expected Behavior
- **Total Rewards**: Should match explorer values (accounting for 2-epoch delay)
- **Last Reward**: Should show the most recent confirmed reward
- **Epoch Filtering**: Should exclude current epoch and previous epoch

### 6. Common Issues to Check
1. **String Conversion**: BigNumber.sum with string conversion may cause precision issues
2. **Epoch Timing**: 2-epoch delay might not account for all discrepancies
3. **Data Source**: Verify the rewards data coming from Blockfrost
4. **Type Mismatches**: Check for BigInt vs BigNumber vs number type issues

### 7. Reporting Issues
When reporting discrepancies, include:
- Console output of `window.rewardsDebugInfo`
- Console output of `window.lastRewardDebugInfo`
- Expected vs actual values
- Wallet address (if safe to share)
- Time period of the discrepancy

## Technical Details

### Build Configuration
- Set `DROP_CONSOLE_IN_PRODUCTION=false` to preserve debugging code
- Uses production webpack configuration with debugging enabled
- Console logging and global variable storage preserved

### Debug Implementation
- Debug info stored in `window.rewardsDebugInfo` and `window.lastRewardDebugInfo`
- Clean console logging in `useStakingRewards` hook (no noisy initialization logs)
- Console access available in both popup and browser views
- No visible UI debug elements - all debugging via console
- **Browser View Fix**: Temporarily disabled multi-delegation to ensure local Staking component is used

### File Locations
- **Rewards Hook**: `src/hooks/useStakingRewards.ts`
- **Blockfrost Comparison Hook**: `src/hooks/useBlockfrostComparison.ts`
- **Browser View**: `src/views/browser-view/features/staking/components/Staking.tsx`
- **Display**: `src/views/browser-view/features/staking/components/StakingInfo/StakingInfo.tsx`
- **Browser View Fix**: `src/hooks/useMultiDelegationEnabled.ts` (temporarily returns false)

### Accessing Debug Information
- **Console Logs**: Essential rewards calculation details without noise
- **Window Objects**: Access debug data via `window.rewardsDebugInfo`, `window.lastRewardDebugInfo`, and `window.blockfrostComparison`
- **Debug Script**: Use `debug-extractor.js` for comprehensive data extraction
- **Clean Output**: Focused on rewards calculation details without cluttering the console
- **Both Views**: Debugging now works in popup AND browser tab view

### Using the Blockfrost Comparison Hook
To integrate automated Blockfrost comparison in your components:

```typescript
import { useBlockfrostComparison } from '@src/hooks/useBlockfrostComparison';

const MyComponent = () => {
  const { totalRewards } = useStakingRewards();
  const { comparisonData, isLoading, stakeAddress } = useBlockfrostComparison(
    totalRewards.toString(), 
    Number(totalRewards)
  );
  
  // comparisonData will contain the full comparison results
  // isLoading shows when the API call is in progress
  // stakeAddress shows the detected stake address
};
```

### Important Notes
- **Multi-Delegation Disabled**: For debugging purposes, the browser view has been configured to use the local Staking component instead of the `@lace/staking` package component
- **Temporary Change**: This change is in `useMultiDelegationEnabled.ts` and should be reverted after debugging is complete
- **Consistent Experience**: Both popup and browser views now provide the same debugging information
