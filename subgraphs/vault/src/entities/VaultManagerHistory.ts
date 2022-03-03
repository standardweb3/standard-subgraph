import { ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ONE_DAY_SECONDS } from 'const'
import { VaultManagerHistory, VaultManagerRunningStat } from '../../generated/schema'
import { getVaultManagerLiquidation } from './Liquidations'
import { getVaultManagerRunningStat } from './RunningStats'
import { getVaultManager } from './vaultManager'

export function getVaultManagerHistory(block: ethereum.Block): VaultManagerHistory {
  const date = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS).toI32()
  const vaultManager = getVaultManager(block)
  const id = vaultManager.id.concat('-').concat(date.toString())

  let history = VaultManagerHistory.load(id)

  if (history === null) {
    const liquidation = getVaultManagerLiquidation(block)
    history.date = date
    history.desiredSupply = vaultManager.desiredSupply
    history.rebaseActive = vaultManager.rebaseActive
    history.manager = vaultManager.id
    history.cdps = vaultManager.cdps

    history.currentBorrowed = vaultManager.currentBorrowed
    history.historicBorrowed = vaultManager.historicBorrowed
    history.historicPaidBack = vaultManager.historicPaidBack

    history.historicVaultCount = vaultManager.historicVaultCount
    history.activeVaultCount = vaultManager.activeVaultCount
    history.historicUserCount = vaultManager.historicUserCount
    history.activeUserCount = vaultManager.activeUserCount

    history.liquidationCount = liquidation.liquidationCount
    history.liquidationAmountUSD = liquidation.liquidationAMMUSD
    history.liquidationFeeUSD = liquidation.liquidationFeeUSD
    history.liquidationAMMUSD = liquidation.liquidationAMMUSD

    history.currentCollateralizedUSD = BIG_DECIMAL_ZERO
    history.historicCollateralizedUSD = BIG_DECIMAL_ZERO
    history.ammReserveCollateralUSD = BIG_DECIMAL_ZERO
    history.currentBorrowedUSD = BIG_DECIMAL_ZERO
  }

  history.block = block.number
  history.timestamp = block.timestamp
  history.save()

  return history as VaultManagerHistory
}

export function updateVaultManagerHistory(block: ethereum.Block): VaultManagerHistory {
  const date = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS).toI32()
  const vaultManager = getVaultManager(block)
  const id = vaultManager.id.concat('-').concat(date.toString())

  let history = VaultManagerHistory.load(id)

  if (history === null) {
    history = new VaultManagerHistory(id)
    history.date = date
  }
  // assumption is that runningStat is updated
  const runningStat = getVaultManagerRunningStat(block)
  const liquidation = getVaultManagerLiquidation(block)

  history.collectedStabilityFee = vaultManager.collectedStabilityFee
  history.desiredSupply = vaultManager.desiredSupply
  history.rebaseActive = vaultManager.rebaseActive
  history.manager = vaultManager.id

  history.cdps = vaultManager.cdps

  history.currentBorrowed = vaultManager.currentBorrowed
  history.historicBorrowed = vaultManager.historicBorrowed
  history.historicPaidBack = vaultManager.historicPaidBack

  history.historicVaultCount = vaultManager.historicVaultCount
  history.activeVaultCount = vaultManager.activeVaultCount
  history.historicUserCount = vaultManager.historicUserCount
  history.activeUserCount = vaultManager.activeUserCount

  history.liquidationCount = liquidation.liquidationCount
  history.liquidationAmountUSD = liquidation.liquidationAMMUSD
  history.liquidationFeeUSD = liquidation.liquidationFeeUSD
  history.liquidationAMMUSD = liquidation.liquidationAMMUSD

  history.currentCollateralizedUSD = runningStat.currentCollateralizedUSD
  history.historicCollateralizedUSD = vaultManager.historicCollateralizedUSD
  history.ammReserveCollateralUSD = runningStat.ammReserveCollateralUSD
  history.currentBorrowedUSD = runningStat.currentBorrowedUSD

  history.block = block.number
  history.timestamp = block.timestamp
  history.save()

  return history as VaultManagerHistory
}
