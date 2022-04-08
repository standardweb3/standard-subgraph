import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ONE_DAY_SECONDS } from 'const'
import { Vault, VaultHistory ,VaultIdTracker} from '../../generated/schema'

export function createVaultIdTracker(vaultId: BigInt, vaultAddress: Address): void {
  const vaultIdTracker = new VaultIdTracker(vaultAddress.toHex())
  vaultIdTracker.vaultId = vaultId
  vaultIdTracker.save()
}

export function getVault(vaultId: BigInt): Vault {
  return Vault.load(vaultId.toString()) as Vault
}

export function createVault(userAddress: Address, vaultId: BigInt, block: ethereum.Block): Vault {
  let vault = Vault.load(vaultId.toString())
  if (vault === null) {
    vault = new Vault(vaultId.toString())
    vault.createdAt = block.timestamp
    vault.createdAtBlock = block.number
    vault.score = BIG_DECIMAL_ZERO
    vault.user = userAddress.toHex()

    vault.save()
  }
  return vault as Vault
}

export function getVaultHistory(vaultId: string, block: ethereum.Block): VaultHistory {
  const date = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS).toI32()
  const id = vaultId.concat('-').concat(date.toString())

  let vaultHistory = VaultHistory.load(id)
  if (vaultHistory === null) {
    vaultHistory = new VaultHistory(id)
    vaultHistory.date = date
    vaultHistory.previousDayScore = BIG_DECIMAL_ZERO
    vaultHistory.save()
  }
  return vaultHistory as VaultHistory
}

export function getVaultHistoryId(vaultId: String, block: ethereum.Block): string {
  const date = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS).toI32()
  const id = vaultId.concat('-').concat(date.toString())

  return id
}

export function getVaultCreatedDate(vaultId: string): i32 {
  const vault = Vault.load(vaultId)
  return vault.createdAt.div(BIG_INT_ONE_DAY_SECONDS).toI32()
}

