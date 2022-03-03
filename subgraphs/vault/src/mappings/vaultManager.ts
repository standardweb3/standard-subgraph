import { Address, BigDecimal, ethereum, log } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_1E18, BIG_DECIMAL_ZERO, BIG_INT_ONE, FACTORY_ADDRESS, MTR_ADDRESS } from 'const'
import { Pair, User } from '../../generated/schema'
import { CDPInitialized, Rebase, RebaseActive, SetFees, VaultCreated, SetDesiredSupply } from '../../generated/VaultManager/VaultManager'
import { getCDP, updateCDPHistory } from '../entities/CDP'
import { createVault, getVault, updateVaultHistory } from '../entities/Vault'
import { getVaultManager } from '../entities/vaultManager'
import { ERC20 } from '../../generated/VaultManager/ERC20'
import { getCollateralVault, updateCollateralVaultHistory } from '../entities/CollateralVault'
import {
  updateCollateralVaultRunningStat,
  updateVaultManagerRunningStat,
  updateVaultRunningStat,
} from '../entities/RunningStats'
import { Vault as VaultTemplate } from '../../generated/templates'
import { updateVaultManagerHistory } from '../entities/VaultManagerHistory'
import { updateUserHistory } from '../entities/User'
import { getFactory } from '../entities/factory'
import { getCollateralReserveUSD } from '../functions'

export function onVaultCreated(event: VaultCreated): void {
  log.info('{} vault created', [event.params.vault.toHex()])
  const cdp = getCDP(event.params.collateral)

  // vault
  const vault = createVault(
    event.params.vaultId,
    event.params.vault,
    event.params.collateral,
    event.params.creator,
    event.block
  )
  vault.currentCollateralized = event.params.cAmount.toBigDecimal().div(cdp.decimals)
  vault.historicCollateralized = vault.currentCollateralized
  vault.currentBorrowed = event.params.dAmount.toBigDecimal().div(BIG_DECIMAL_1E18)
  vault.historicBorrowed = vault.currentBorrowed
  vault.save()

  VaultTemplate.create(event.params.vault)

  // vaultstat update
  const vaultStat = updateVaultRunningStat(event.params.vaultId, event.block)

  // vault manager
  const manager = getVaultManager(event.block)
  manager.historicBorrowed = manager.historicBorrowed.plus(vault.currentBorrowed)
  manager.currentBorrowed = manager.currentBorrowed.plus(vault.currentBorrowed)
  manager.historicVaultCount = manager.historicVaultCount.plus(BIG_INT_ONE)
  manager.historicCollateralizedUSD = manager.historicCollateralizedUSD.plus(vaultStat.currentCollateralizedUSD)
  manager.activeVaultCount = manager.activeVaultCount.plus(BIG_INT_ONE)
  manager.save()

  const managerStat = updateVaultManagerRunningStat(event.block)
  managerStat.currentCollateralizedUSD = managerStat.currentCollateralizedUSD.plus(vaultStat.currentCollateralizedUSD)
  managerStat.save()

  // collateral vault
  const collateralVault = getCollateralVault(event.params.collateral, event.block)
  collateralVault.historicCollateralized = collateralVault.historicCollateralized.plus(vault.currentCollateralized)
  collateralVault.currentCollateralized = collateralVault.currentCollateralized.plus(vault.currentCollateralized)
  collateralVault.historicBorrowed = collateralVault.historicBorrowed.plus(vault.currentBorrowed)
  collateralVault.currentBorrowed = collateralVault.currentBorrowed.plus(vault.currentBorrowed)
  collateralVault.historicVaultCount = collateralVault.historicVaultCount.plus(BIG_INT_ONE)
  collateralVault.activeVaultCount = collateralVault.activeVaultCount.plus(BIG_INT_ONE)
  collateralVault.historicCollateralizedUSD = collateralVault.historicCollateralizedUSD.plus(
    vaultStat.currentCollateralizedUSD
  )
  collateralVault.save()

  const cVaultStat = updateCollateralVaultRunningStat(
    Address.fromString(collateralVault.collateral.toHex()),
    event.block
  )

  // user
  const user = User.load(event.params.creator.toHex())
  user.historicBorrowed = user.historicBorrowed.plus(vault.currentBorrowed)
  user.currentBorrowed = user.currentBorrowed.plus(vault.currentBorrowed)
  user.historicVaultCount = user.historicVaultCount.plus(BIG_INT_ONE)
  user.activeVaultCount = user.activeVaultCount.plus(BIG_INT_ONE)
  user.save()

  updateVaultManagerHistory(event.block)
  updateCollateralVaultHistory(event.params.collateral, event.block)
  updateVaultHistory(event.params.vaultId, event.block)
  updateUserHistory(event.params.creator, event.block)
  updateVaultManagerRunningStat2(event.block)
}

export function onSetFees(event: SetFees): void {}

export function onCDPInitialized(event: CDPInitialized): void {
  log.info('{} CDP initialized', [event.params.collateral.toHex()])

  // create manager
  const manager = getVaultManager(event.block)

  // initialize cdp
  const cdp = getCDP(event.params.collateral)

  // initialize cVault
  const cVault = getCollateralVault(event.params.collateral, event.block)
  cVault.cdp = cdp.id
  cVault.save()

  // append cdp id to vault manager's cdps
  const newCdps = manager.cdps
  newCdps.push(cdp.id)
  manager.cdps = newCdps
  manager.save()

  cdp.lfr = event.params.lfr.toBigDecimal()
  cdp.sfr = event.params.sfr.toBigDecimal()
  cdp.mcr = event.params.mcr.toBigDecimal()
  cdp.isOpen = event.params.isOpen

  // call erc20 collateral contract to fetch decimals
  if (cdp.decimals.equals(BIG_DECIMAL_ZERO)) {
    const contract = ERC20.bind(event.params.collateral)
    const decimals = contract.try_decimals()
    if (!decimals.reverted) {
      cdp.decimals = BigDecimal.fromString('1'.concat('0'.repeat(decimals.value)))
    }
  }

  cdp.save()

  updateVaultManagerHistory(event.block)
  updateCDPHistory(event.params.collateral, event.block)
  updateVaultManagerRunningStat2(event.block)
}

export function onRebase(event: Rebase): void {
  const manager = getVaultManager(event.block)
  let newDesiredSupply = event.params.desiredSupply.toBigDecimal()
  if (newDesiredSupply.gt(BIG_DECIMAL_ZERO)) {
    newDesiredSupply = newDesiredSupply.div(BIG_DECIMAL_1E18)
  }

  manager.desiredSupply = newDesiredSupply

  manager.save()
  updateVaultManagerRunningStat2(event.block)
}

export function onRebaseActive(event: RebaseActive): void {
  if (event.params.set) {
    log.info('Rebase is active', [])
  } else {
    log.info('Rebase is inactive', [])
  }

  const manager = getVaultManager(event.block)

  manager.rebaseActive = event.params.set

  manager.save()
  updateVaultManagerRunningStat2(event.block)
}

export function onSetDesiredSupply(event:SetDesiredSupply): void {
  const manager = getVaultManager(event.block)
  let newDesiredSupply = event.params.desiredSupply.toBigDecimal()
  if (newDesiredSupply.gt(BIG_DECIMAL_ZERO)) {
    newDesiredSupply = newDesiredSupply.div(BIG_DECIMAL_1E18)
  }
  manager.desiredSupply = newDesiredSupply
  manager.save()
  updateVaultManagerRunningStat2(event.block)
}

export function updateVaultManagerRunningStat2(block: ethereum.Block): void {
  log.info('vaultManager blockchange', [])
  // get vault manager
  const manager = getVaultManager(block)
  const cdps = manager.cdps

  // get manager running stat
  const managerStat = updateVaultManagerRunningStat(block)
  const nextUpdateThreshold = managerStat.autoUpdateTimestamp.toI32() + 60 * 5

  if (block.timestamp.toI32() >= nextUpdateThreshold) {
    managerStat.autoUpdateTimestamp = block.timestamp
    managerStat.save()

    let currentCollateralizedUSD = BIG_DECIMAL_ZERO
    let ammReserveCollateralUSD = BIG_DECIMAL_ZERO

    for (let i = 0; i < cdps.length; i++) {
      // cdpId = collateral
      const cdpId = cdps[i]

      const cVaultStat = updateCollateralVaultRunningStat(Address.fromString(cdpId), block)
      currentCollateralizedUSD = currentCollateralizedUSD.plus(cVaultStat.currentCollateralizedUSD)

      const pair = Pair.load(cdpId)
      if (pair !== null) {
        // add later
      }

      updateCollateralVaultHistory(Address.fromString(cdpId), block)
    }

    managerStat.currentCollateralizedUSD = currentCollateralizedUSD

    const factory = getFactory()
    const pairs = factory.pairs

    for (let i = 0; i < pairs.length; i++) {
      const pairId = pairs[i]
      const collateralReserveUSD = getCollateralReserveUSD(Address.fromString(pairId))
      ammReserveCollateralUSD = ammReserveCollateralUSD.plus(collateralReserveUSD)
    }
    log.info('{} amm', [ammReserveCollateralUSD.toString()])
    managerStat.ammReserveCollateralUSD = ammReserveCollateralUSD

    // log.info('end of blockchange', [])
    managerStat.save()
  }

  updateVaultManagerHistory(block)
}
