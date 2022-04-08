import { Address, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ONE } from 'const'
import { User, Vault, VaultHistory } from '../../generated/schema'
import { getDateFromTimestamp } from '../functions'
import { getScoreAggregator } from './ScoreAggregator'
import { getVaultHistory, getVaultHistoryId } from './Vault'

export function getUser(address: Address): User {
  let user = User.load(address.toHex())
  if (user === null) {
    let scoreAggregator = getScoreAggregator()

    user = new User(address.toHex())
    user.score = BIG_DECIMAL_ZERO
    scoreAggregator.usersCount = scoreAggregator.usersCount.plus(BIG_INT_ONE)
  }
  user.save()
  return user as User
}

export function updateUserScore(userAddress: Address, vaultId: string, block: ethereum.Block): void {
  const user = getUser(userAddress)
  const historyId = getVaultHistoryId(vaultId, block)
  const vault = Vault.load(vaultId)
  const vaultCreatedDate = getDateFromTimestamp(vault.createdAt)
  const scoreAggregator = getScoreAggregator()

  let history = VaultHistory.load(historyId)
  if (history === null) {
    const historyDate = getDateFromTimestamp(block.timestamp)
    if (vaultCreatedDate != historyDate) {
      user.score = user.score.plus(vault.score)
      user.save()

      scoreAggregator.totalScore = scoreAggregator.totalScore.plus(vault.score)
      scoreAggregator.save()

      history = getVaultHistory(vaultId, block)
      history.previousDayScore = vault.score
      history.save()
    } else {
      history = getVaultHistory(vaultId, block)
      history.save()
    }
  }
}
