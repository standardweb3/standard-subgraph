import { dataSource, ethereum } from '@graphprotocol/graph-ts'

import { BondedStrategy } from '../../generated/schema'
import { BondedStrategy as BondedStrategyContract } from '../../generated/BondedStrategy/BondedStrategy'
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from 'const'

export function getBondedStrategy(block: ethereum.Block): BondedStrategy {
  let bondedStrategy = BondedStrategy.load(dataSource.address().toHex())

  if (bondedStrategy === null) {
    const contract = BondedStrategyContract.bind(dataSource.address())
    bondedStrategy = new BondedStrategy(dataSource.address().toHex())

    bondedStrategy.totalClaimedUSD = BIG_DECIMAL_ZERO
    bondedStrategy.totalSupply = BIG_INT_ZERO

    bondedStrategy.stnd = contract.stnd()
    bondedStrategy.usersCount = BIG_INT_ZERO

    bondedStrategy.remainingRewardETH = BIG_DECIMAL_ZERO

    bondedStrategy.inception = block.timestamp
  }

  bondedStrategy.block = block.number
  bondedStrategy.timestamp = block.timestamp
  bondedStrategy.save()

  return bondedStrategy as BondedStrategy
}
