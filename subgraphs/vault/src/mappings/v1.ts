import { ADDRESS_ZERO, BIG_INT_ONE } from 'const'
import { Transfer } from '../../generated/V1/V1'
import { getUser, updateUserHistory } from '../entities/User'
import { getVault } from '../entities/Vault'

export function handleTransfer(event: Transfer): void {
  if (event.params.from.notEqual(ADDRESS_ZERO) && event.params.to.notEqual(ADDRESS_ZERO)) {
    const to = getUser(event.params.to, event.block)
    to.historicVaultCount = to.historicVaultCount.plus(BIG_INT_ONE)
    to.activeVaultCount = to.activeVaultCount.plus(BIG_INT_ONE)

    const vault = getVault(event.params.tokenId, event.block)
    vault.user = to.id
    vault.save()

    to.currentBorrowed = to.currentBorrowed.plus(vault.currentBorrowed)
    to.save()

    const from = getUser(event.params.from, event.block)
    from.activeVaultCount = from.activeVaultCount.minus(BIG_INT_ONE)
    from.currentBorrowed = from.currentBorrowed.minus(vault.currentBorrowed)
    from.save()

    updateUserHistory(event.params.from, event.block)
    updateUserHistory(event.params.to, event.block)
  }
}
