import { User } from '../../generated/schema'
import { BigInt, Address, ethereum, log } from '@graphprotocol/graph-ts'
import { BIG_INT_ZERO, BIG_INT_ONE, BIG_DECIMAL_ZERO } from 'const'
import { getMasterChef } from './masterChef'
import { getPool } from './pool'

export function getUser(address: Address, pid: BigInt, block: ethereum.Block): User {
  const pool = getPool(pid, block)

  const uid = address.toHex()
  const id = pid.toString().concat('-').concat(uid)
  let user = User.load(id)
  log.info('userid {}', [id])

  if (user === null) {
    user = new User(id)
    user.address = address
    user.pool = pool.id
    user.amount = BIG_INT_ZERO
    user.rewardDebt = BIG_INT_ZERO
    user.sushiHarvested = BIG_DECIMAL_ZERO

    user.sushiHarvestedUSD = BIG_DECIMAL_ZERO
    user.entryUSD = BIG_DECIMAL_ZERO
    user.exitUSD = BIG_DECIMAL_ZERO
    log.info('add user 0',[])
    log.info('plus: prev user count {}', [pool.userCount.toString()])
    pool.userCount = pool.userCount.plus(BIG_INT_ONE)
    log.info('plus: pid {} user count {}',[pool.id.toString(), pool.userCount.toString()])
    pool.save()
    log.info('pool saved 2', [])
  }

  user.timestamp = block.timestamp
  user.block = block.number
  user.save()

  return user as User
}