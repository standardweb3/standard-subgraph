import { Address, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from 'const'
import { BondedStrategyPair } from '../../generated/schema'

export function getBondedStrategyPair(pairId: Address, block: ethereum.Block): BondedStrategyPair {
  let pair = BondedStrategyPair.load(pairId.toHex())

  if (pair === null) {
    pair = new BondedStrategyPair(pairId.toHex())
    pair.pair = pairId.toHex()
    pair.claimedReward = BIG_INT_ZERO
    pair.claimedRewardUSD = BIG_DECIMAL_ZERO

    pair.remainingReward = BIG_INT_ZERO
    pair.remainingRewardETH = BIG_DECIMAL_ZERO
  }

  pair.block = block.number
  pair.timestamp = block.timestamp

  pair.save()

  return pair as BondedStrategyPair
}
