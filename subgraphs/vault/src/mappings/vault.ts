import { Address, ethereum, log } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_1E18, BIG_DECIMAL_ZERO, BIG_INT_ONE } from 'const'
import {
  Borrow,
  BorrowMore,
  CloseVault,
  DepositCollateral,
  Liquidated,
  PayBack,
  WithdrawCollateral,
} from '../../generated/VaultManager/Vault'
import { getCDP } from '../entities/CDP'
import { getCollateralVault, updateCollateralVaultHistory } from '../entities/CollateralVault'
import { createVaultLiquidation } from '../entities/Liquidations'
import {
  updateCollateralVaultRunningStat,
  updateVaultManagerRunningStat,
  updateVaultRunningStat,
} from '../entities/RunningStats'
import { getUser, updateUserHistory } from '../entities/User'
import { getVault, updateVaultHistory } from '../entities/Vault'
import { getVaultManager } from '../entities/vaultManager'
import { updateVaultManagerHistory } from '../entities/VaultManagerHistory'
import { getAssetPrice } from '../utils/vaultManager'
import { updateVaultManagerRunningStat2 } from './vaultManager'

export function onBlockChange(block: ethereum.Block): void {
  log.info('vaultblock', [])
}

export function onDepositCollateral(event: DepositCollateral): void {
  log.info('Collateral Deposited {} {}', [event.params.amount.toHexString(), event.params.vaultID.toString()])

  const vault = getVault(event.params.vaultID, event.block)
  const cdp = getCDP(Address.fromString(vault.collateral.toHex()))

  // // update vault - add amt
  const depositAmount = event.params.amount.toBigDecimal().div(cdp.decimals)
  vault.currentCollateralized = vault.currentCollateralized.plus(depositAmount)
  vault.historicCollateralized = vault.historicCollateralized.plus(depositAmount)
  vault.save()

  const collateralPrice = getAssetPrice(Address.fromString(vault.collateral.toHex()))
  const depositAmountUSD = depositAmount.times(collateralPrice)

  // // // update vault running stat
  const vaultStat = updateVaultRunningStat(event.params.vaultID, event.block)

  // // update cVault - add amt
  const collateralVault = getCollateralVault(Address.fromString(vault.collateral.toHex()), event.block)
  collateralVault.currentCollateralized = collateralVault.currentCollateralized.plus(depositAmount)
  collateralVault.historicCollateralized = collateralVault.historicCollateralized.plus(depositAmount)
  collateralVault.historicCollateralizedUSD = collateralVault.historicCollateralizedUSD.plus(depositAmountUSD)
  collateralVault.save()

  // // update cVault running stat
  const cVaultStats = updateCollateralVaultRunningStat(
    Address.fromString(collateralVault.collateral.toHex()),
    event.block
  )

  const manager = getVaultManager(event.block)
  manager.historicCollateralizedUSD = manager.historicCollateralizedUSD.plus(depositAmountUSD)
  manager.save()

  updateVaultHistory(event.params.vaultID, event.block)
  updateUserHistory(Address.fromString(vault.user), event.block)
  updateCollateralVaultHistory(Address.fromString(vault.collateral.toHex()), event.block)
  updateVaultManagerHistory(event.block)
  updateVaultManagerRunningStat2(event.block)
}

export function onWithdrawCollateral(event: WithdrawCollateral): void {
  log.info('Collateral withdrawn', [])

  const vault = getVault(event.params.vaultID, event.block)
  const cdp = getCDP(Address.fromString(vault.collateral.toHex()))

  // // update vault - deduct amt
  const withdrawAmount = event.params.amount.toBigDecimal().div(cdp.decimals)
  vault.currentCollateralized = vault.currentCollateralized.minus(withdrawAmount)
  vault.save()

  // // update vault running stat
  const vaultStat = updateVaultRunningStat(event.params.vaultID, event.block)

  // // update cVault - deduct amt
  const collateralVault = getCollateralVault(Address.fromString(vault.collateral.toHex()), event.block)
  collateralVault.currentCollateralized = collateralVault.currentCollateralized.minus(withdrawAmount)
  collateralVault.save()

  // // update cVault running stat
  const cVaultStats = updateCollateralVaultRunningStat(
    Address.fromString(collateralVault.collateral.toHex()),
    event.block
  )

  updateVaultHistory(event.params.vaultID, event.block)
  updateUserHistory(Address.fromString(vault.user), event.block)
  updateCollateralVaultHistory(Address.fromString(vault.collateral.toHex()), event.block)
  updateVaultManagerRunningStat2(event.block)
}

export function onPayBack(event: PayBack): void {
  log.info('Pay back', [])

  // get vault
  const vault = getVault(event.params.vaultID, event.block)

  // used to update cVault and VaultManager
  const vaultPreviousBorrowed = vault.currentBorrowed

  // event params
  const payBackAmt = event.params.amount.toBigDecimal().div(BIG_DECIMAL_1E18)
  let fee = event.params.paybackFee.toBigDecimal()
  if (fee.gt(BIG_DECIMAL_ZERO)) {
    fee = fee.div(BIG_DECIMAL_1E18)
  }
  const remainingBorrowed = event.params.borrow.toBigDecimal().div(BIG_DECIMAL_1E18)

  const previousVaultBorrowed = vault.currentBorrowed
  // update vault
  vault.currentBorrowed = remainingBorrowed
  vault.collectedStabilityFee = vault.collectedStabilityFee.plus(fee)
  vault.historicPaidBack = vault.historicPaidBack.plus(payBackAmt).minus(fee)
  vault.lastPaidBack = event.block.timestamp
  vault.save()

  // update vault stat
  const vaultStat = updateVaultRunningStat(event.params.vaultID, event.block)

  const user = getUser(Address.fromString(vault.user), event.block)
  user.currentBorrowed = user.currentBorrowed.minus(previousVaultBorrowed).plus(remainingBorrowed)
  user.historicBorrowed = user.historicPaidBack.plus(payBackAmt)
  user.save()

  const manager = getVaultManager(event.block)
  manager.currentBorrowed = manager.currentBorrowed.minus(vaultPreviousBorrowed).plus(vault.currentBorrowed)
  manager.collectedStabilityFee = manager.collectedStabilityFee.plus(fee)
  manager.historicPaidBack = manager.historicPaidBack.plus(payBackAmt).minus(fee)
  manager.save()

  const managerStat = updateVaultManagerRunningStat(event.block)

  // update cVault
  const collateralVault = getCollateralVault(Address.fromString(vault.collateral.toHex()), event.block)
  collateralVault.currentBorrowed = collateralVault.currentBorrowed
    .minus(vaultPreviousBorrowed)
    .plus(vault.currentBorrowed)
  collateralVault.collectedStabilityFee = collateralVault.collectedStabilityFee.plus(fee)
  collateralVault.historicPaidBack = collateralVault.historicPaidBack.plus(payBackAmt).minus(fee)
  collateralVault.save()

  const cVaultStats = updateCollateralVaultRunningStat(
    Address.fromString(collateralVault.collateral.toHex()),
    event.block
  )

  updateVaultHistory(event.params.vaultID, event.block)
  updateUserHistory(Address.fromString(vault.user), event.block)
  updateCollateralVaultHistory(Address.fromString(vault.collateral.toHex()), event.block)
  updateVaultManagerHistory(event.block)
  updateVaultManagerRunningStat2(event.block)
}

export function onBorrowMore(event: BorrowMore): void {
  log.info('Borrow', [])
  const vault = getVault(event.params.vaultID, event.block)
  const cdp = getCDP(Address.fromString(vault.collateral.toHex()))
  const borrowAmount = event.params.dAmount.toBigDecimal().div(BIG_DECIMAL_1E18)
  let depositAmount = event.params.cAmount.toBigDecimal()
  if (depositAmount.gt(BIG_DECIMAL_ZERO)) {
    depositAmount = depositAmount.div(cdp.decimals)
  }
  vault.currentBorrowed = vault.currentBorrowed.plus(borrowAmount)
  vault.historicBorrowed = vault.historicBorrowed.plus(borrowAmount)
  vault.currentCollateralized = vault.currentCollateralized.plus(depositAmount)
  vault.historicCollateralized = vault.historicCollateralized.plus(depositAmount)
  vault.save()

  const vaultStat = updateVaultRunningStat(event.params.vaultID, event.block)

  const user = getUser(Address.fromString(vault.user), event.block)
  user.currentBorrowed = user.currentBorrowed.plus(borrowAmount)
  user.save()

  const manager = getVaultManager(event.block)
  manager.currentBorrowed = manager.currentBorrowed.plus(borrowAmount)
  manager.historicBorrowed = manager.historicBorrowed.plus(borrowAmount)
  manager.save()

  const managerStat = updateVaultManagerRunningStat(event.block)

  const collateralPrice = getAssetPrice(Address.fromString(vault.collateral.toHex()))
  const depositAmountUSD = depositAmount.times(collateralPrice)

  const collateralVault = getCollateralVault(Address.fromString(vault.collateral.toHex()), event.block)
  collateralVault.currentBorrowed = collateralVault.currentBorrowed.plus(borrowAmount)
  collateralVault.historicBorrowed = collateralVault.historicBorrowed.plus(borrowAmount)
  collateralVault.currentCollateralized = collateralVault.currentCollateralized.plus(depositAmount)
  collateralVault.historicCollateralized = collateralVault.historicCollateralized.plus(depositAmount)
  collateralVault.historicCollateralizedUSD = collateralVault.historicCollateralizedUSD.plus(depositAmountUSD)
  collateralVault.save()

  const cVaultStats = updateCollateralVaultRunningStat(
    Address.fromString(collateralVault.collateral.toHex()),
    event.block
  )

  updateVaultHistory(event.params.vaultID, event.block)
  updateUserHistory(Address.fromString(vault.user), event.block)
  updateCollateralVaultHistory(Address.fromString(vault.collateral.toHex()), event.block)
  updateVaultManagerHistory(event.block)
  updateVaultManagerRunningStat2(event.block)
}

export function onCloseVault(event: CloseVault): void {
  log.info('Close Vault', [])

  const vault = getVault(event.params.vaultID, event.block)
  let amount = event.params.amount.toBigDecimal()
  if (amount.gt(BIG_DECIMAL_ZERO)) {
    amount = amount.div(BIG_DECIMAL_1E18)
  }
  let fee = event.params.closingFee.toBigDecimal()
  if (fee.gt(BIG_DECIMAL_ZERO)) {
    fee = fee.div(BIG_DECIMAL_1E18)
  }

  const vaultPreviousBorrowed = vault.currentBorrowed
  const vaultPreviousCollateralized = vault.currentCollateralized

  vault.currentBorrowed = BIG_DECIMAL_ZERO
  vault.historicPaidBack = vault.historicPaidBack.plus(amount).minus(fee)
  vault.collectedStabilityFee = vault.collectedStabilityFee.plus(fee)
  vault.currentCollateralized = BIG_DECIMAL_ZERO
  vault.isClosed = true
  vault.save()

  const vaultStat = updateVaultRunningStat(event.params.vaultID, event.block)

  const user = getUser(Address.fromString(vault.user), event.block)
  user.currentBorrowed = user.currentBorrowed.minus(vaultPreviousBorrowed)
  user.activeVaultCount = user.activeVaultCount.minus(BIG_INT_ONE)
  user.historicPaidBack = user.historicPaidBack.plus(amount).minus(fee)
  user.save()

  // mod code to update user as well
  const manager = getVaultManager(event.block)
  manager.currentBorrowed = manager.currentBorrowed.minus(vaultPreviousBorrowed)
  manager.historicPaidBack = manager.historicPaidBack.plus(amount).minus(fee)
  manager.collectedStabilityFee = manager.collectedStabilityFee.plus(fee)
  manager.activeVaultCount = manager.activeVaultCount.minus(BIG_INT_ONE)
  manager.save()

  const managerStat = updateVaultManagerRunningStat(event.block)

  const collateralVault = getCollateralVault(Address.fromString(vault.collateral.toHex()), event.block)
  collateralVault.currentBorrowed = collateralVault.currentBorrowed.minus(vaultPreviousBorrowed)
  collateralVault.historicPaidBack = collateralVault.historicPaidBack.plus(amount).minus(fee)
  collateralVault.activeVaultCount = collateralVault.activeVaultCount.minus(BIG_INT_ONE)
  collateralVault.currentCollateralized = collateralVault.currentCollateralized.minus(vaultPreviousCollateralized)
  collateralVault.save()

  const cVaultStats = updateCollateralVaultRunningStat(
    Address.fromString(collateralVault.collateral.toHex()),
    event.block
  )

  updateVaultHistory(event.params.vaultID, event.block)
  updateUserHistory(Address.fromString(vault.user), event.block)
  updateCollateralVaultHistory(Address.fromString(vault.collateral.toHex()), event.block)
  updateVaultManagerHistory(event.block)
  updateVaultManagerRunningStat2(event.block)
}

export function onLiquidated(event: Liquidated): void {
  const vault = getVault(event.params.vaultID, event.block)
  vault.isLiquidated = true

  const vaultLiquidation = createVaultLiquidation(event.params.vaultID, event.block)

  const user = getUser(Address.fromString(vault.user), event.block)
  user.liquidateCount = user.liquidateCount.plus(BIG_INT_ONE)
  user.activeVaultCount = user.activeVaultCount.minus(BIG_INT_ONE)

  log.info('Liquidated', [])
}
