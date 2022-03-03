import { Address, BigDecimal, log } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_1E8, BIG_DECIMAL_ZERO, VAULT_MANAGER_ADDRESS } from 'const'
import { VaultManager as VaultManagerContract } from '../../generated/VaultManager/VaultManager'

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

// export function getCDPConfig(collateral: Address): {} {
//     const contract = VaultManager.bind(VAULT_MANAGER_ADDRESS)

//     const cdpConfig = contract.try_getCDPConfig(collateral)

//     if (!cdpConfig.reverted) {
//         return {
//             mcr: cdpConfig.value.value0.toBigDecimal(),
//             lfr: cdpConfig.value.value1.toBigDecimal(),
//             sfr: cdpConfig.value.value2.toBigDecimal(),
//             decimals: cdpConfig.value.value3.toBigDecimal()
//         }
//     }

//     return {
//         mcr: BIG_DECIMAL_ZERO,
//         lfr: BIG_DECIMAL_ZERO,
//         sfr: BIG_DECIMAL_ZERO,
//         decimals: BIG_DECIMAL_ZERO
//     }
// }
