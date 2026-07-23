const compareAscending = (a: bigint, b: bigint): number =>
  a < b ? -1 : a > b ? 1 : 0;

/**
 * Partitions a target quantity into parts proportional to the given weights
 * (port of `partitionNatural` from cardano-coin-selection).
 *
 * Uses the largest-remainder method: each part receives the floor of its
 * ideal proportional share, and the leftover units are awarded to the parts
 * with the largest remainders (ties broken by the larger integral part, then
 * by earlier position). The parts always sum exactly to the target.
 *
 * @param target - The quantity to partition. Must not be negative.
 * @param weights - The weight of each part. Must have a positive total.
 * @returns The parts, in the same order as the given weights.
 */
export const partition = (
  target: bigint,
  weights: readonly bigint[],
): bigint[] => {
  const totalWeight = weights.reduce((total, weight) => total + weight, 0n);
  if (totalWeight <= 0n) {
    throw new Error(
      `Cannot partition ${target} by weights with total ${totalWeight}: a positive total weight is required`,
    );
  }

  const parts = weights.map(weight => (target * weight) / totalWeight);
  const remainders = weights.map(weight => (target * weight) % totalWeight);
  let shortfall = target - parts.reduce((total, part) => total + part, 0n);

  while (shortfall > 0n) {
    let best = -1;
    for (let index = 0; index < parts.length; index++) {
      if (remainders[index] === 0n) continue;
      if (
        best < 0 ||
        remainders[index] > remainders[best] ||
        (remainders[index] === remainders[best] && parts[index] > parts[best])
      ) {
        best = index;
      }
    }
    if (best < 0) break;

    parts[best] += 1n;
    remainders[best] = 0n;
    shortfall -= 1n;
  }

  return parts;
};

/**
 * Adjusts a list of quantities to a given length, preserving its sum and
 * returning it in ascending order (port of `padCoalesce` from
 * cardano-coin-selection).
 *
 * The quantities are first sorted ascending. A source shorter than the target
 * length is padded with zeros at the front; a longer one has its two smallest
 * quantities repeatedly coalesced (summed and re-inserted in sorted position)
 * until the target length is reached.
 *
 * @param quantities - The source quantities.
 * @param targetSize - The desired length. Must be greater than zero.
 * @returns The adjusted quantities, sorted ascending.
 */
export const padCoalesce = (
  quantities: readonly bigint[],
  targetSize: number,
): bigint[] => {
  const sorted = [...quantities].sort(compareAscending);

  while (sorted.length > targetSize) {
    const coalesced = (sorted.shift() as bigint) + (sorted.shift() as bigint);
    let insertAt = 0;
    while (insertAt < sorted.length && sorted[insertAt] < coalesced) {
      insertAt += 1;
    }
    sorted.splice(insertAt, 0, coalesced);
  }

  const padding = new Array<bigint>(targetSize - sorted.length).fill(0n);
  return [...padding, ...sorted];
};

/**
 * Reduces the total of an ascending list of quantities by a reduction target,
 * zeroing out the smallest quantities first (port of `reduceTokenQuantities`
 * from cardano-coin-selection).
 *
 * @param reductionTarget - The total amount to remove.
 * @param quantities - The quantities to reduce, sorted ascending.
 * @returns A new list with the reduction applied, same length and order.
 */
export const reduceTokenQuantities = (
  reductionTarget: bigint,
  quantities: readonly bigint[],
): bigint[] => {
  const reduced = [...quantities];
  let remaining = reductionTarget;

  for (let index = 0; index < reduced.length && remaining > 0n; index++) {
    if (reduced[index] >= remaining) {
      reduced[index] -= remaining;
      remaining = 0n;
    } else {
      remaining -= reduced[index];
      reduced[index] = 0n;
    }
  }

  return reduced;
};
