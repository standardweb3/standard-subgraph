import { VaultCreated } from '../../generated/VaultManager/VaultManager'
import { Vault, Vault as VaultTemplate } from '../../generated/templates'
import { createVault, createVaultIdTracker } from '../entities/vault'
import { BIG_DECIMAL_1E18 } from 'const'
import { getUser } from '../entities/User'

export function onVaultCreated(event: VaultCreated): void {
  getUser(event.params.creator)

  VaultTemplate.create(event.params.vault)
  createVaultIdTracker(event.params.vaultId, event.params.vault)

  const vault = createVault(event.params.creator, event.params.vaultId, event.block)
  vault.score = event.params.dAmount.toBigDecimal().div(BIG_DECIMAL_1E18)
  vault.save()
}
