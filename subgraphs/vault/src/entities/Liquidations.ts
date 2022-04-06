import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO, VAULT_MANAGER_ADDRESS } from 'const'
import { CollateralVaultLiquidation, Vault, VaultLiquidation, VaultManagerLiquidation } from '../../generated/schema'

export function getVaultManagerLiquidation(block: ethereum.Block): VaultManagerLiquidation {
  let liquidation = VaultManagerLiquidation.load(VAULT_MANAGER_ADDRESS.toHex())

  if (liquidation === null) {
    liquidation = new VaultManagerLiquidation(VAULT_MANAGER_ADDRESS.toHex())

    liquidation.manager = VAULT_MANAGER_ADDRESS.toHex()
    liquidation.liquidationCount = BIG_INT_ZERO
    liquidation.liquidationAmountUSD = BIG_DECIMAL_ZERO
    liquidation.liquidationFeeUSD = BIG_DECIMAL_ZERO
    liquidation.liquidationAMMUSD = BIG_DECIMAL_ZERO
  }

  liquidation.block = block.number
  liquidation.timestamp = block.timestamp

  liquidation.save()

  return liquidation as VaultManagerLiquidation
}

export function getCollateralVaultLiquidation(collateral: Address, block: ethereum.Block): CollateralVaultLiquidation {
  let liquidation = CollateralVaultLiquidation.load(collateral.toHex())

  if (liquidation === null) {
    liquidation = new CollateralVaultLiquidation(collateral.toHex())

    liquidation.collateralVault = collateral.toHex()
    liquidation.liquidationCount = BIG_INT_ZERO
    liquidation.liquidationAmount = BIG_DECIMAL_ZERO
    liquidation.liquidationAmountUSD = BIG_DECIMAL_ZERO
    liquidation.liquidationFee = BIG_DECIMAL_ZERO
    liquidation.liquidationFeeUSD = BIG_DECIMAL_ZERO
    liquidation.liquidationAMM = BIG_DECIMAL_ZERO
    liquidation.liquidationAMMUSD = BIG_DECIMAL_ZERO
  }

  liquidation.block = block.number
  liquidation.timestamp = block.timestamp

  liquidation.save()

  return liquidation as CollateralVaultLiquidation
}

export function createVaultLiquidation(gIndex: BigInt, block: ethereum.Block): VaultLiquidation {
  const vault = Vault.load(gIndex.toString())
  const id = vault.id.concat('-liquidation')

  let liquidation = new VaultLiquidation(id)
  liquidation.vault = gIndex.toString()
  liquidation.liquidationAmount = BIG_DECIMAL_ZERO
  liquidation.liquidationAmountUSD = BIG_DECIMAL_ZERO
  liquidation.liquidationFee = BIG_DECIMAL_ZERO
  liquidation.liquidationFeeUSD = BIG_DECIMAL_ZERO
  liquidation.liquidationAMM = BIG_DECIMAL_ZERO
  liquidation.liquidationAMMUSD = BIG_DECIMAL_ZERO

  liquidation.block = block.number
  liquidation.timestamp = block.timestamp

  liquidation.save()

  return liquidation as VaultLiquidation
}
