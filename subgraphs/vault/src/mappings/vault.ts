import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { BIG_DECIMAL_1E18, BIG_DECIMAL_ZERO, BIG_INT_ONE } from "const";
import { User, VaultRunningStat } from "../../generated/schema";
import { CloseVault, DepositCollateral, PayBack, WithdrawCollateral } from "../../generated/VaultManager/Vault";
import { getCDP } from "../entities/CDP";
import { getCollateralVault } from "../entities/CollateralVault";
import {  updateCollateralVaultRunningStat, updateVaultManagerRunningStat, updateVaultRunningStat } from "../entities/RunningStats";
import { getUser } from "../entities/User";
import { getVault } from "../entities/Vault";
import { getVaultManager } from "../entities/vaultManager";

export function onDepositCollateral(event: DepositCollateral): void {
    log.info('Collateral Deposited', [])
    
    const vault = getVault(event.params.vaultID, event.block)
    const cdp = getCDP(Address.fromString(vault.collateral.toHex()))
    
    // update vault - add amt
    const depositAmount = event.params.amount.toBigDecimal().div(cdp.decimals)
    vault.currrentCollateralized = vault.currrentCollateralized.plus(depositAmount)
    vault.historicCollateralized = vault.historicCollateralized.plus(depositAmount)
    vault.save()

    // // update vault running stat
    const newVaultStat = updateVaultRunningStat(event.params.vaultID, event.block)

    // update cVault - add amt
    const collateralVault = getCollateralVault(Address.fromString(vault.collateral.toHex()), event.block)
    collateralVault.historicCollateralized = collateralVault.historicCollateralized.plus(depositAmount)
    collateralVault.currentCollateralized = collateralVault.currentCollateralized.plus(depositAmount)
    collateralVault.save()

    // update cVault running stat
    const cVaultStats = updateCollateralVaultRunningStat(Address.fromString(collateralVault.collateral.toHex()), event.block)
}


export function onWithdrawCollateral(event: WithdrawCollateral): void {
    log.info('Collateral withdrawn', [])

    const vault = getVault(event.params.vaultID, event.block)
    const cdp = getCDP(Address.fromString(vault.collateral.toHex()))

    // update vault - deduct amt
    const withdrawAmount = event.params.amount.toBigDecimal().div(cdp.decimals)
    vault.currrentCollateralized = vault.currrentCollateralized.minus(withdrawAmount)
    vault.save()

    // update vault running stat
    const newVaultStat = updateVaultRunningStat(event.params.vaultID, event.block)
  
    // update cVault - deduct amt
    const collateralVault = getCollateralVault(Address.fromString(vault.collateral.toHex()), event.block)
    collateralVault.currentCollateralized = collateralVault.currentCollateralized.minus(withdrawAmount)
    collateralVault.save()
  
    // update cVault running stat
    const cVaultStats = updateCollateralVaultRunningStat(Address.fromString(collateralVault.collateral.toHex()), event.block)
}

export function onPayBack(event: PayBack): void {
    log.info('Pay back', [])

    // get vault
    const vault = getVault(event.params.vaultID, event.block)

    // used to update cVault and VaultManager
    const vaultPreviousBorrowed = vault.currentBorrowed

    // event params
    const payBackAmt = event.params.amount.toBigDecimal().div(BIG_DECIMAL_1E18)
    const fee = event.params.paybackFee.toBigDecimal().div(BIG_DECIMAL_1E18)
    const remainingBorrowed = event.params.borrow.toBigDecimal().div(BIG_DECIMAL_1E18)

    vault.currentBorrowed = remainingBorrowed
    vault.collectedStabilityFee = vault.collectedStabilityFee.plus(fee)
    vault.historicPaidBack = vault.historicPaidBack.plus(payBackAmt).minus(fee)
    vault.save()

    // update vault stat
    const vaultStat = updateVaultRunningStat(BigInt.fromString(vault.id), event.block)

    const manager = getVaultManager(event.block)
    manager.currentBorrowed = manager.currentBorrowed.minus(vaultPreviousBorrowed).plus(vault.currentBorrowed)
    manager.collectedStabilityFee = manager.collectedStabilityFee.plus(fee)
    manager.historicPaidBack = manager.historicPaidBack.plus(payBackAmt).minus(fee)
    manager.save()

    const managerStat = updateVaultManagerRunningStat(event.block)

    // update cVault
    const collateralVault = getCollateralVault(Address.fromString(vault.collateral.toHex()), event.block)
    collateralVault.currentBorrowed = collateralVault.currentBorrowed.minus(vaultPreviousBorrowed).plus(vault.currentBorrowed)
    collateralVault.collectedStabilityFee = collateralVault.collectedStabilityFee.plus(fee)
    collateralVault.historicPaidBack = collateralVault.historicPaidBack.plus(payBackAmt).minus(fee)
    collateralVault.save()

    const cVaultStat = updateCollateralVaultRunningStat(Address.fromString(collateralVault.collateral.toHex()), event.block)
}


// export function onCloseVault(event:CloseVault):void {
//     log.info('Close Vault', [])

//     const vault = getVault(event.params.vaultId, event.block)
//     const vaultPreviousBorrowed = vault.currentBorrowed
//     const vaultPreviousCollateralized = vault.currrentCollateralized

//     const payBackAmt = event.params.amount.toBigDecimal().div(BIG_DECIMAL_1E18)
//     const fee = event.params.closingFee.toBigDecimal().div(BIG_DECIMAL_1E18)

//     // update vault
//     vault.currentBorrowed = BIG_DECIMAL_ZERO
//     vault.currrentCollateralized = BIG_DECIMAL_ZERO
//     vault.collectedStabilityFee = vault.collectedStabilityFee.plus(fee)
//     vault.historicPaidBack = vault.historicPaidBack.plus(payBackAmt).minus(fee)
//     vault.isClosed = true
//     vault.save()

//     // update vaultStats
//     const vaultStat = updateVaultRunningStat(BigInt.fromString(vault.id), event.block)

//     // update manager
//     const manager = getVaultManager(event.block)
//     manager.currentBorrowed = manager.currentBorrowed.minus(vaultPreviousBorrowed)
//     manager.collectedStabilityFee = manager.collectedStabilityFee.plus(fee)
//     manager.historicPaidBack = manager.historicPaidBack.plus(payBackAmt).minus(fee)
//     manager.activeVaultCount = manager.activeVaultCount.minus(BIG_INT_ONE)
//     manager.save()

//     // update manager stats
//     const managerStats = updateVaultManagerRunningStat(event.block)

//     const collateralVault = getCollateralVault(Address.fromString(vault.collateral.toHex()), event.block)
//     collateralVault.currentBorrowed = collateralVault.currentBorrowed.minus(vaultPreviousBorrowed)
//     collateralVault.currentCollateralized = collateralVault.currentCollateralized.minus(vaultPreviousCollateralized)
//     collateralVault.collectedStabilityFee = collateralVault.collectedStabilityFee.plus(fee)
//     collateralVault.historicPaidBack = collateralVault.historicPaidBack.plus(payBackAmt).minus(fee)
//     collateralVault.activeVaultCount = collateralVault.activeVaultCount.minus(BIG_INT_ONE)

//     collateralVault.save()
// add user handle
// }