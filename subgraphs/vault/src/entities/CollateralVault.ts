import { Address, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ONE_DAY_SECONDS, BIG_INT_ZERO } from 'const'
import { CollateralVault, CollateralVaultHistory } from '../../generated/schema'
import { getAssetPrice } from '../utils/vaultManager'
import { getCDP } from './CDP'
import { getCollateralVaultLiquidation } from './Liquidations'
// import { getCollateralVaultRunningStat } from './RunningStats'

export function getCollateralVault(collateral: Address, block: ethereum.Block): CollateralVault {
  let vault = CollateralVault.load(collateral.toHex())

  if (vault === null) {
    vault = new CollateralVault(collateral.toHex())

    vault.collateral = collateral
    vault.historicBorrowed = BIG_DECIMAL_ZERO
    vault.currentBorrowed = BIG_DECIMAL_ZERO
    vault.historicPaidBack = BIG_DECIMAL_ZERO
    vault.currentCollateralized = BIG_DECIMAL_ZERO
    vault.historicCollateralized = BIG_DECIMAL_ZERO
    vault.historicCollateralizedUSD = BIG_DECIMAL_ZERO

    vault.historicVaultCount = BIG_INT_ZERO
    vault.activeVaultCount = BIG_INT_ZERO

    vault.collectedStabilityFee = BIG_DECIMAL_ZERO
  }

  vault.block = block.number
  vault.timestamp = block.timestamp

  vault.save()

  return vault as CollateralVault
}

export function updateCollateralVaultHistory(collateral: Address, block: ethereum.Block): CollateralVaultHistory {
  const date = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS).toI32()
  const cVault = getCollateralVault(collateral, block)
  const id = cVault.id.concat('-').concat(date.toString())

  let history = CollateralVaultHistory.load(id)

  if (history === null) {
    history = new CollateralVaultHistory(id)
    history.date = date
  }

  // const runningStat = getCollateralVaultRunningStat(collateral, block)
  const liquidation = getCollateralVaultLiquidation(collateral, block)
  let assetPrice = getAssetPrice(Address.fromString(cVault.collateral.toHex()));
  const cdp = getCDP(Address.fromString(cVault.collateral.toHex()))

  history.collateralVault = cVault.id
  history.collateralPrice = assetPrice

  history.historicBorrowed = cVault.historicBorrowed
  history.currentBorrowed = cVault.currentBorrowed

  history.historicPaidBack = cVault.historicPaidBack
  history.currentCollateralized = cVault.currentCollateralized
  history.currentCollateralizedUSD = cVault.currentCollateralized.times(assetPrice)
  history.historicCollateralized = cVault.historicCollateralized
  history.historicCollateralizedUSD = cVault.historicCollateralizedUSD

  history.liquidationCount = liquidation.liquidationCount
  history.liquidationAmount = liquidation.liquidationAmount
  history.liquidationAmountUSD = liquidation.liquidationAmountUSD

  history.liquidationFeeUSD = liquidation.liquidationFeeUSD
  history.liquidationAMM = liquidation.liquidationAMM
  history.liquidationAMMUSD = liquidation.liquidationAMMUSD

  history.timestamp = block.timestamp
  history.block = block.number

  history.save()

  return history as CollateralVaultHistory
}
