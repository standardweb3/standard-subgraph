import { MasterChef } from '../../generated/schema'
import { MasterPool as MasterChefContract } from '../../generated/MasterPool/MasterPool'
import { dataSource, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from 'const'

export function getMasterChef(block: ethereum.Block): MasterChef {
  let masterChef = MasterChef.load(dataSource.address().toHex())

  if (masterChef === null) {
    const contract = MasterChefContract.bind(dataSource.address())
    masterChef = new MasterChef(dataSource.address().toHex())
    masterChef.totalAllocPoint = BIG_INT_ZERO
    masterChef.poolCount = BIG_INT_ZERO
    masterChef.sushiPerBlock = contract.sushiPerBlock()
    masterChef.migrator = contract.migrator()

    // v1 integration
    masterChef.slpBalanceDecimal = BIG_DECIMAL_ZERO
    masterChef.slpAge = BIG_DECIMAL_ZERO
    masterChef.slpAgeRemoved = BIG_DECIMAL_ZERO
    masterChef.slpDeposited = BIG_DECIMAL_ZERO
    masterChef.slpWithdrawn = BIG_DECIMAL_ZERO

    // more like initialization timestamp
    masterChef.updatedAt = block.timestamp
  }

  masterChef.timestamp = block.timestamp
  masterChef.block = block.number
  masterChef.save()

  return masterChef as MasterChef
}
