import { MTR_ADDRESS } from 'const'
import { PairCreated } from '../../generated/Factory/Factory'
import { CDP } from '../../generated/schema'
import { getCDP } from '../entities/CDP'
import { getFactory } from '../entities/Factory'
import { createPair } from '../entities/Pair'

export function onPairCreated(event: PairCreated): void {
  const isToken0Mtr = event.params.token0.equals(MTR_ADDRESS)
  const isToken1Mtr = event.params.token1.equals(MTR_ADDRESS)

  let cdp = getCDP(event.params.token0)
  if (isToken0Mtr) {
    cdp = getCDP(event.params.token1)
  }

  if (cdp === null || (!isToken1Mtr && !isToken0Mtr)) {
    return
  }

  const pair = createPair(event.params.pair, event.block, event.params.token0, event.params.token1, isToken0Mtr)

  // We returned null for some reason, we should silently bail without creating this pair
  if (!pair) {
    return
  }

  const factory = getFactory()
  const newPairs = factory.pairs
  newPairs.push(pair.id)

  factory.pairs = newPairs
  factory.save()
  // Now it's safe to save
  pair.save()
}
