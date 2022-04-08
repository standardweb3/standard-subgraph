import { Address, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ONE, BIG_INT_ONE_DAY_SECONDS, BIG_INT_ZERO } from 'const'
import { User, UserHistory } from '../../generated/schema'
import { getVaultManager } from './Vault'

export function getUser(address: Address, block: ethereum.Block): User {
  let user = User.load(address.toHex())

  if (user === null) {
    // increase user count (historic)
    const manager = getVaultManager(block)
    manager.historicUserCount = manager.historicUserCount.plus(BIG_INT_ONE)
    manager.activeUserCount = manager.activeUserCount.plus(BIG_INT_ONE)
    manager.save()

    user = new User(address.toHex())

    user.currentBorrowed = BIG_DECIMAL_ZERO
    user.historicBorrowed = BIG_DECIMAL_ZERO
    user.historicPaidBack = BIG_DECIMAL_ZERO

    user.historicVaultCount = BIG_INT_ZERO
    user.activeVaultCount = BIG_INT_ZERO
    user.liquidateCount = BIG_INT_ZERO
  }

  user.block = block.number
  user.timestamp = block.timestamp

  user.save()

  return user as User
}

export function updateUserHistory(address: Address, block: ethereum.Block): UserHistory {
  const date = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS).toI32()
  let user = User.load(address.toHex())
  const id = user.id.concat('-').concat(date.toString())

  let history = UserHistory.load(id)
  if (history === null) {
    history = new UserHistory(id)
    history.user = user.id
    history.date = date
  }

  history.historicBorrowed = user.historicBorrowed
  history.currentBorrowed = user.currentBorrowed
  history.historicPaidBack = user.historicPaidBack

  history.historicVaultCount = user.historicVaultCount
  history.activeVaultCount = user.activeVaultCount
  history.liquidateCount = user.liquidateCount

  history.block = block.number
  history.timestamp = block.timestamp

  history.save()

  return history as UserHistory
}
