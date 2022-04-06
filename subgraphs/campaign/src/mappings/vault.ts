import { Address, dataSource, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_1E18, BIG_DECIMAL_ZERO } from 'const'
import { VaultIdTracker } from '../../generated/schema'
import { BorrowMore, CloseVault, PayBack } from '../../generated/VaultManager/Vault'
import { updateUserScore } from '../entities/User'
import { getVault } from '../entities/vault'

export function onBorrowMore(event: BorrowMore): void {
  const vault = getVault(event.params.vaultID)
  vault.score = vault.score.plus(event.params.dAmount.toBigDecimal().div(BIG_DECIMAL_1E18))
  vault.save()
}

export function onPayBack(event: PayBack): void {
  const vault = getVault(event.params.vaultID)
  vault.score = vault.score.minus(event.params.amount.toBigDecimal().div(BIG_DECIMAL_1E18))
  if (vault.score.le(BIG_DECIMAL_ZERO)) {
    vault.score = BIG_DECIMAL_ZERO
  }
  vault.save()
}

export function onCloseVault(event: CloseVault): void {
  const vault = getVault(event.params.vaultID)
  vault.score = BIG_DECIMAL_ZERO
  vault.save()
}

export function handleBlock(block: ethereum.Block): void {
  const vaultIdTracker = VaultIdTracker.load(dataSource.address().toHex())
  const vault = getVault(vaultIdTracker.vaultId)

  updateUserScore(Address.fromString(vault.user), vault.id, block)
}
