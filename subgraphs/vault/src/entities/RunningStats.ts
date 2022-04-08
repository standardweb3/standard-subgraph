import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, MTR_ADDRESS, VAULT_MANAGER_ADDRESS } from 'const'
import { CollateralVaultRunningStat, VaultManagerRunningStat, VaultRunningStat } from '../../generated/schema'
import { getAssetPrice } from '../utils/vaultManager'
import { getVault } from './Vault'
import { getCollateralVault } from './CollateralVault'
import { getVaultManager } from './VaultManager'
import { getCDP } from './CDP'
import { getDebt } from '../utils/vault'

export function getVaultManagerRunningStat(block: ethereum.Block): VaultManagerRunningStat {
  let stats = VaultManagerRunningStat.load(VAULT_MANAGER_ADDRESS.toHex())
  const manager = getVaultManager(block)

  if (stats === null) {
    stats = new VaultManagerRunningStat(manager.id)

    stats.manager = manager.id

    stats.ammReserveCollateralUSD = BIG_DECIMAL_ZERO
    stats.currentCollateralizedUSD = BIG_DECIMAL_ZERO
    stats.autoUpdateTimestamp = block.timestamp

    stats.stablecoinPrice = BIG_DECIMAL_ZERO
    stats.currentBorrowedUSD = BIG_DECIMAL_ZERO
  }

  stats.block = block.number
  stats.timestamp = block.timestamp

  stats.save()

  return stats as VaultManagerRunningStat
}

export function updateVaultManagerRunningStat(block: ethereum.Block): VaultManagerRunningStat {
  let stats = VaultManagerRunningStat.load(VAULT_MANAGER_ADDRESS.toHex())
  const manager = getVaultManager(block)

  if (stats === null) {
    stats = new VaultManagerRunningStat(manager.id)

    stats.manager = manager.id

    stats.ammReserveCollateralUSD = BIG_DECIMAL_ZERO
    stats.currentCollateralizedUSD = BIG_DECIMAL_ZERO
    stats.autoUpdateTimestamp = block.timestamp
  }

  stats.stablecoinPrice = getAssetPrice(Address.fromString(manager.stablecoin.toHex()))
  stats.currentBorrowedUSD = manager.currentBorrowed.times(stats.stablecoinPrice)

  stats.block = block.number
  stats.timestamp = block.timestamp

  stats.save()

  return stats as VaultManagerRunningStat
}

export function getVaultRunningStat(gIndex: BigInt, block: ethereum.Block): VaultRunningStat {
  let stats = VaultRunningStat.load(gIndex.toString())
  const vault = getVault(gIndex, block)

  if (stats === null) {
    stats = new VaultRunningStat(vault.id)
    stats.vault = vault.id
    // stats.needsLiquidation = false
    stats.autoUpdateTimestamp = block.timestamp

    stats.collateralPrice = BIG_DECIMAL_ZERO
    stats.currentCollateralizedUSD = BIG_DECIMAL_ZERO

    stats.stablecoinPrice = BIG_DECIMAL_ZERO
    stats.currentBorrowedUSD = BIG_DECIMAL_ZERO

    stats.debt = BIG_DECIMAL_ZERO
    stats.debtUSD = BIG_DECIMAL_ZERO

    stats.accruedStabilityFee = BIG_DECIMAL_ZERO
    stats.accruedStabilityFeeUSD = BIG_DECIMAL_ZERO
  }

  stats.block = block.number
  stats.timestamp = block.timestamp
  stats.save()

  return stats as VaultRunningStat
}

export function updateVaultRunningStat(gIndex: BigInt, block: ethereum.Block): VaultRunningStat {
  let stats = VaultRunningStat.load(gIndex.toString())
  const vault = getVault(gIndex, block)

  if (stats === null) {
    stats = new VaultRunningStat(vault.id)
    stats.vault = vault.id
    // stats.needsLiquidation = false
    stats.autoUpdateTimestamp = block.timestamp
  }

  const cdp = getCDP(Address.fromString(vault.collateral.toHex()))

  stats.collateralPrice = getAssetPrice(Address.fromString(vault.collateral.toHex()))
  stats.currentCollateralizedUSD = vault.currentCollateralized.times(stats.collateralPrice)

  stats.stablecoinPrice = getAssetPrice(Address.fromString(vault.stablecoin.toHex()))
  stats.currentBorrowedUSD = vault.currentBorrowed.times(stats.stablecoinPrice)

  const debt = getDebt(Address.fromString(vault.address.toHex()))
  stats.debt = debt
  stats.debtUSD = stats.debt.times(stats.stablecoinPrice)

  stats.accruedStabilityFee = stats.debt.minus(vault.currentBorrowed)
  stats.accruedStabilityFeeUSD = stats.debtUSD.minus(stats.currentBorrowedUSD)

  // const ratio = stats.currentCollateralizedUSD.div(stats.currentBorrowedUSD).times(BIG_INT_ONE_HUNDRED.toBigDecimal())
  // if (ratio.lt(cdp.mcr)) {
  //   stats.needsLiquidation = true
  // }

  stats.block = block.number
  stats.timestamp = block.timestamp
  stats.save()

  return stats as VaultRunningStat
}

export function updateCollateralVaultRunningStat(
  collateral: Address,
  block: ethereum.Block
): CollateralVaultRunningStat {
  let stats = CollateralVaultRunningStat.load(collateral.toHex())
  const vault = getCollateralVault(collateral, block)

  if (stats === null) {
    stats = new CollateralVaultRunningStat(collateral.toHex())
    stats.collateralVault = vault.id
    stats.autoUpdateTimestamp = block.timestamp
  }

  stats.collateralPrice = getAssetPrice(Address.fromString(vault.collateral.toHex()))
  stats.currentCollateralizedUSD = vault.currentCollateralized.times(stats.collateralPrice)

  stats.stablecoinPrice = getAssetPrice(MTR_ADDRESS)
  stats.currentBorrowedUSD = vault.currentBorrowed.times(stats.stablecoinPrice)

  stats.block = block.number
  stats.timestamp = block.timestamp
  stats.save()

  return stats as CollateralVaultRunningStat
}

export function getCollateralVaultRunningStat(collateral: Address, block: ethereum.Block): CollateralVaultRunningStat {
  let stats = CollateralVaultRunningStat.load(collateral.toHex())
  const vault = getCollateralVault(collateral, block)

  if (stats === null) {
    stats = new CollateralVaultRunningStat(collateral.toHex())
    stats.collateralVault = vault.id
    stats.autoUpdateTimestamp = block.timestamp

    stats.collateralPrice = BIG_DECIMAL_ZERO
    stats.currentCollateralizedUSD = BIG_DECIMAL_ZERO

    stats.stablecoinPrice = BIG_DECIMAL_ZERO
    stats.currentBorrowedUSD = BIG_DECIMAL_ZERO
  }

  stats.block = block.number
  stats.timestamp = block.timestamp
  stats.save()

  return stats as CollateralVaultRunningStat
}
