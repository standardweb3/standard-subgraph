import { Address, BigDecimal, log } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_1E8, BIG_DECIMAL_ZERO, VAULT_MANAGER_ADDRESS } from 'const'
import { VaultManager as VaultManagerContract } from '../../generated/templates/Pair/VaultManager'

export function getAssetPrice(asset: Address): BigDecimal {
  const contract = VaultManagerContract.bind(VAULT_MANAGER_ADDRESS)

  const assetPrice = contract.try_getAssetPrice(asset)

  if (!assetPrice.reverted) {
    let assetPriceDecimals = assetPrice.value.toBigDecimal()
    if (assetPriceDecimals.gt(BIG_DECIMAL_ZERO)) {
      assetPriceDecimals = assetPriceDecimals.div(BIG_DECIMAL_1E8)
    }
    return assetPriceDecimals
  }

  return BIG_DECIMAL_ZERO
}

// export function getCDP(collateral: Address): CDP {
//   let cdp = CDP.load(collateral.toHex())

//   if (cdp === null) {
//     cdp = new CDP(collateral.toHex())
//     cdp.vaultManager = VAULT_MANAGER_ADDRESS.toHex()
//     cdp.symbol = getSymbol(collateral)
//     cdp.lfr = BIG_DECIMAL_ZERO
//     cdp.sfr = BIG_DECIMAL_ZERO
//     cdp.mcr = BIG_DECIMAL_ZERO
//     cdp.expiary = BIG_DECIMAL_ZERO
//     cdp.decimals = BIG_DECIMAL_ZERO
//     cdp.isOpen = false
//   }

//   cdp.save()

//   // always goes first if
//   if (cdp.decimals.equals(BIG_DECIMAL_ZERO)) {
//     return getCDPWithDecimals(collateral)
//   } else {
//     return cdp as CDP
//   }
// }

// export function getCDPWithDecimals(collateral: Address): CDP {
//   let cdp = CDP.load(collateral.toHex())

//   const contract = ERC20.bind(collateral)
//   const decimals = contract.try_decimals()
//   if (!decimals.reverted) {
//     cdp.decimals = BigDecimal.fromString('1'.concat('0'.repeat(decimals.value)))
//   }

//   cdp.save()

//   return cdp as CDP
// }
