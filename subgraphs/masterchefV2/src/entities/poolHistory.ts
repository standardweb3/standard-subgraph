import { ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ONE_DAY_SECONDS, BIG_INT_ZERO } from 'const'
import { Pool, PoolHistory } from '../../generated/schema'

export function getPoolHistory(pool: Pool, block: ethereum.Block): PoolHistory {
  const day = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS)

  const id = pool.id.concat(day.toString())

  let history = PoolHistory.load(id)

  if (history === null) {
    history = new PoolHistory(id)
    history.pool = pool.id
    history.userCount = BIG_INT_ZERO
    history.slpBalanceDecimal = BIG_DECIMAL_ZERO
    history.slpAge = BIG_DECIMAL_ZERO
    history.slpAgeRemoved = BIG_DECIMAL_ZERO
    history.slpDeposited = BIG_DECIMAL_ZERO
    history.slpWithdrawn = BIG_DECIMAL_ZERO
    history.timestamp = block.timestamp
    history.block = block.number
    history.entryUSD = BIG_DECIMAL_ZERO
    history.exitUSD = BIG_DECIMAL_ZERO
    history.sushiHarvested = BIG_DECIMAL_ZERO
    history.sushiHarvestedUSD = BIG_DECIMAL_ZERO
  }

  return history as PoolHistory
}
