import { Address, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ONE_DAY_SECONDS, BIG_INT_ZERO } from 'const'
import { BondedStrategyTokenHistory } from '../../generated/schema'

export function getBondedStrategyTokenHistory(tokenId: Address, block: ethereum.Block, isPair: boolean): BondedStrategyTokenHistory {
  const day = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS)
  const id = tokenId.toHex().concat('-').concat(day.toString())

  let tokenHistory = BondedStrategyTokenHistory.load(id)

  if (tokenHistory === null) {
    tokenHistory = new BondedStrategyTokenHistory(id)
    tokenHistory.token = tokenId
    tokenHistory.isPair = isPair;
    tokenHistory.timeframe = 'Day'
    tokenHistory.date = day.toI32() * 86400

    tokenHistory.claimedReward = BIG_INT_ZERO
    tokenHistory.claimedRewardUSD = BIG_DECIMAL_ZERO

    tokenHistory.remainingReward = BIG_INT_ZERO
    tokenHistory.remainingRewardETH = BIG_DECIMAL_ZERO
    tokenHistory.remainingRewardUSD = BIG_DECIMAL_ZERO
  }

  tokenHistory.block = block.number
  tokenHistory.timestamp = block.timestamp

  tokenHistory.save()

  return tokenHistory as BondedStrategyTokenHistory
}
