import { ethereum } from '@graphprotocol/graph-ts'
import {
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_ZERO,
  BIG_INT_ZERO,
  FACTORY_ADDRESS,
  MTR_ADDRESS,
  V1_ADDRESS,
  VAULT_MANAGER_ADDRESS,
} from 'const'
import { VaultManager } from '../../generated/schema'
import { VaultManager as VaultManagerContract } from '../../generated/VaultManager/VaultManager'

export function getVaultManager(block: ethereum.Block): VaultManager {
  let vaultManager = VaultManager.load(VAULT_MANAGER_ADDRESS.toHex())

  if (vaultManager === null) {
    vaultManager = new VaultManager(VAULT_MANAGER_ADDRESS.toHex())
    vaultManager.desiredSupply = BIG_DECIMAL_ZERO
    vaultManager.rebaseActive = false

    vaultManager.v1 = V1_ADDRESS
    vaultManager.stablecoin = MTR_ADDRESS
    vaultManager.v2Factory = FACTORY_ADDRESS
    vaultManager.initialized = false

    vaultManager.historicBorrowed = BIG_DECIMAL_ZERO
    vaultManager.currentBorrowed = BIG_DECIMAL_ZERO
    vaultManager.historicPaidBack = BIG_DECIMAL_ZERO
    vaultManager.historicCollateralizedUSD = BIG_DECIMAL_ZERO

    vaultManager.historicVaultCount = BIG_INT_ZERO
    vaultManager.activeVaultCount = BIG_INT_ZERO
    vaultManager.historicUserCount = BIG_INT_ZERO
    vaultManager.activeUserCount = BIG_INT_ZERO

    vaultManager.collectedStabilityFee = BIG_DECIMAL_ZERO
    vaultManager.cdps = []
  }

  if (!vaultManager.initialized) {
    vaultManager.block = block.number
    vaultManager.timestamp = block.timestamp
    vaultManager.save()
    return initializeVaultManager()
  } else {
    vaultManager.block = block.number
    vaultManager.timestamp = block.timestamp
    vaultManager.save()

    return vaultManager as VaultManager
  }
}

export function initializeVaultManager(): VaultManager {
  const vaultManagerContract = VaultManagerContract.bind(VAULT_MANAGER_ADDRESS)
  let vaultManager = VaultManager.load(VAULT_MANAGER_ADDRESS.toHex())

  let vaultManagerContractRebaseActive = vaultManagerContract.try_rebaseActive()

  if (!vaultManagerContractRebaseActive.reverted) {
    vaultManager.rebaseActive = vaultManagerContractRebaseActive.value
  }

  let vaultManagerContractDesiredSupply = vaultManagerContract.try_desiredSupply()

  if (!vaultManagerContractDesiredSupply.reverted) {
    vaultManager.desiredSupply = vaultManagerContractDesiredSupply.value.toBigDecimal().div(BIG_DECIMAL_1E18)
  }

  if (!vaultManagerContractRebaseActive.reverted && !vaultManagerContractDesiredSupply.reverted) {
    vaultManager.initialized = true
  }

  vaultManager.save()

  return vaultManager as VaultManager
}
