import { Address, BigDecimal, ethereum, log } from "@graphprotocol/graph-ts";
import { BIG_DECIMAL_1E18, BIG_DECIMAL_ZERO, BIG_INT_ONE, FACTORY_ADDRESS, MTR_ADDRESS } from "const";
import { CDP, User } from "../../generated/schema";
import { CDPInitialized, Rebase, RebaseActive, SetFees, VaultCreated } from "../../generated/VaultManager/VaultManager";
import { getCDP } from "../entities/CDP";
import { createVault } from "../entities/Vault";
import { getVaultManager } from "../entities/vaultManager";
import { ERC20 } from '../../generated/VaultManager/ERC20';
import { getCollateralVault } from "../entities/CollateralVault";
import { updateCollateralVaultRunningStat, updateVaultManagerRunningStat, updateVaultRunningStat } from "../entities/RunningStats";

export function onVaultCreated(event: VaultCreated): void {
    log.info('vault created', [])

    const cdp = getCDP(event.params.collateral)

    // vault 
    const vault = createVault(event.params.vaultId, event.params.vault, event.params.collateral, event.params.creator, event.block)
    vault.currrentCollateralized = event.params.cAmount.toBigDecimal().div(cdp.decimals)
    vault.historicCollateralized = vault.currrentCollateralized
    vault.currentBorrowed = event.params.dAmount.toBigDecimal().div(BIG_DECIMAL_1E18)
    vault.historicBorrowed = vault.currentBorrowed
    vault.save()

    // vaultstat update
    const vaultStat = updateVaultRunningStat(event.params.vaultId, event.block)

    // vault manager
    const manager = getVaultManager(event.block);
    manager.historicBorrowed = manager.historicBorrowed.plus(vault.currentBorrowed)
    manager.currentBorrowed = manager.currentBorrowed.plus(vault.currentBorrowed)
    manager.historicVaultCount = manager.historicVaultCount.plus(BIG_INT_ONE)
    manager.activeVaultCount = manager.activeVaultCount.plus(BIG_INT_ONE)
    manager.save()

    const managerStat = updateVaultManagerRunningStat(event.block)
    managerStat.historicCollateralizedUSD = managerStat.historicCollateralizedUSD.plus(vaultStat.currentCollateralizedUSD)
    managerStat.currentCollateralizedUSD = managerStat.currentCollateralizedUSD.plus(vaultStat.currentCollateralizedUSD)
    managerStat.save()

    // collateral vault
    const collateralVault = getCollateralVault(event.params.collateral, event.block)
    collateralVault.historicCollateralized = collateralVault.historicCollateralized.plus(vault.currrentCollateralized)
    collateralVault.currentCollateralized = collateralVault.currentCollateralized.plus(vault.currrentCollateralized)
    collateralVault.historicBorrowed = collateralVault.historicBorrowed.plus(vault.currentBorrowed)
    collateralVault.currentBorrowed = collateralVault.currentBorrowed.plus(vault.currentBorrowed)
    collateralVault.historicVaultCount = collateralVault.historicVaultCount.plus(BIG_INT_ONE)
    collateralVault.activeVaultCount = collateralVault.activeVaultCount.plus(BIG_INT_ONE)
    collateralVault.save()

    const cVaultStat = updateCollateralVaultRunningStat(Address.fromString(collateralVault.collateral.toHex()), event.block)

    // user
    const user = User.load(event.params.creator.toHex())
    user.historicBorrowed = user.historicBorrowed.plus(vault.currentBorrowed)
    user.currentBorrowed = user.currentBorrowed.plus(vault.currentBorrowed)
    user.historicVaultCount = user.historicVaultCount.plus(BIG_INT_ONE)
    user.activeVaultCount = user.activeVaultCount.plus(BIG_INT_ONE)
    user.save()
}

export function onSetFees(event: SetFees): void {
}

export function onCDPInitialized(event: CDPInitialized): void {
    log.info('{} CDP initialized', [event.params.collateral.toHex()])

    const manager = getVaultManager(event.block)
    const cdp = getCDP(event.params.collateral)

    const newCdps = manager.cdps
    newCdps.push(cdp.id)
    manager.cdps = newCdps
    manager.save()

    cdp.lfr = event.params.lfr.toBigDecimal()
    cdp.sfr = event.params.sfr.toBigDecimal()
    cdp.mcr = event.params.sfr.toBigDecimal()

    if (cdp.decimals.equals(BIG_DECIMAL_ZERO)) {
        const contract = ERC20.bind(event.params.collateral)
        const decimals = contract.try_decimals()
        if (!decimals.reverted){
            cdp.decimals = BigDecimal.fromString('1'.concat('0'.repeat(decimals.value)))
        }
    }

    cdp.save()
}

export function onRebase(event: Rebase): void {
    const manager = getVaultManager(event.block)

    manager.desiredSupply = event.params.desiredSupply.toBigDecimal()

    manager.save()
}

export function onRebaseActive(event: RebaseActive): void {
    if (event.params.set) {
        log.info('Rebase is active',[])
    } else {
        log.info('Rebase is inactive',[])
    }

    const manager = getVaultManager(event.block)

    manager.rebaseActive = event.params.set

    manager.save()
}

export function onBlockChange(block:ethereum.Block): void {
    log.warning('cdpcdpblock', [])
    const manager = getVaultManager(block)
    const cdps = manager.cdps

    const managerStat = updateVaultManagerRunningStat(block)
    const nextUpdateThreshold = managerStat.autoUpdateTimestamp.toI32() + 60 * 5

    if (block.timestamp.toI32() >= nextUpdateThreshold) {
        managerStat.autoUpdateTimestamp = block.timestamp
        managerStat.save() 

        let currentCollateralizedUSD = BIG_DECIMAL_ZERO
        let historicCollateralizedUSD = BIG_DECIMAL_ZERO
        let ammReserveCollateralUSD = BIG_DECIMAL_ZERO

        for (let i = 0; i < cdps.length; i++) {
            // cdpId = collateral
           const cdpId = cdps[i]   
     
            const cVaultStat = updateCollateralVaultRunningStat(Address.fromString(cdpId), block)
            currentCollateralizedUSD = currentCollateralizedUSD.plus(cVaultStat.currentCollateralizedUSD)
            historicCollateralizedUSD = historicCollateralizedUSD.plus(cVaultStat.historicCollateralizedUSD)
        }

        managerStat.currentCollateralizedUSD = currentCollateralizedUSD
        managerStat.historicCollateralizedUSD = historicCollateralizedUSD
    
        managerStat.save()

    }
}
