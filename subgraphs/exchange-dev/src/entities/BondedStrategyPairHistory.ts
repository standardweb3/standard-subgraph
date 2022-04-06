import { Address, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ONE_DAY_SECONDS, BIG_INT_ZERO } from 'const'
import { BondedStrategyPairHistory } from '../../generated/schema'

export function getBondedStrategyPairHistory(pairId: Address, block: ethereum.Block): BondedStrategyPairHistory {
  const day = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS)
  const id = pairId.toHex().concat('-').concat(day.toString())

  let pairHistory = BondedStrategyPairHistory.load(id)

  if (pairHistory === null) {
    pairHistory = new BondedStrategyPairHistory(id)
    pairHistory.pair = pairId
    pairHistory.timeframe = 'Day'
    pairHistory.date = day.toI32() * 86400

    pairHistory.claimedReward = BIG_INT_ZERO
    pairHistory.claimedRewardUSD = BIG_DECIMAL_ZERO

    pairHistory.remainingReward = BIG_INT_ZERO
    pairHistory.remainingRewardETH = BIG_DECIMAL_ZERO
    pairHistory.remainingRewardUSD = BIG_DECIMAL_ZERO
  }

  pairHistory.block = block.number
  pairHistory.timestamp = block.timestamp

  pairHistory.save()

  return pairHistory as BondedStrategyPairHistory
}
