import { Address, BigDecimal, log } from '@graphprotocol/graph-ts'
import {  BIG_DECIMAL_ZERO, NULL_CALL_RESULT_VALUE } from 'const'
import { ERC20 } from '../../generated/Factory/ERC20'
import { ERC20SymbolBytes } from '../../generated/Factory/ERC20SymbolBytes'
import { Pair as PairContract } from '../../generated/Factory/Pair'
import { CDP, Pair } from '../../generated/schema'
import { getAssetPrice } from '../utils/vaultManager'

export function getSymbol(address: Address): string {
    const contract = ERC20.bind(address)
    const contractSymbolBytes = ERC20SymbolBytes.bind(address)
  
    // try types string and bytes32 for symbol
    let symbolValue = 'unknown'
    const symbolResult = contract.try_symbol()
    if (symbolResult.reverted) {
      const symbolResultBytes = contractSymbolBytes.try_symbol()
      if (!symbolResultBytes.reverted) {
        // for broken pairs that have no symbol function exposed
        if (symbolResultBytes.value.toHex() != NULL_CALL_RESULT_VALUE) {
          symbolValue = symbolResultBytes.value.toString()
        }
      }
    } else {
      symbolValue = symbolResult.value
    }
    return symbolValue
  }

export function getCollateralReserveUSD(address: Address): BigDecimal {
  const pair = Pair.load(address.toHex())
  const pairContract = PairContract.bind(address)
  const result = pairContract.try_getReserves()

  if (!result.reverted) {
    if (pair.isToken0Mtr) {
      const cdp = CDP.load(pair.token1)
      if (cdp !== null) {
      const collateralPrice = getAssetPrice(Address.fromString(pair.token1))
      // const reserveMtr = result.value.value0.toBigDecimal()
      let reserveCollateral = result.value.value1.toBigDecimal()
      if (reserveCollateral.gt(BIG_DECIMAL_ZERO)) {
        reserveCollateral = reserveCollateral.div(cdp.decimals)
      }
      const reserveCollateralUSD = reserveCollateral.times(collateralPrice)

      return reserveCollateralUSD
      }
    }
    if (!pair.isToken0Mtr) {
      const cdp = CDP.load(pair.token0)
      if (cdp !== null) {

      const collateralPrice = getAssetPrice(Address.fromString(pair.token0))
      // const reserveMtr = result.value.value1.toBigDecimal()
      let reserveCollateral = result.value.value0.toBigDecimal()
      if (reserveCollateral.gt(BIG_DECIMAL_ZERO)) {
        reserveCollateral = reserveCollateral.div(cdp.decimals)
      }

      const reserveCollateralUSD = reserveCollateral.times(collateralPrice)

      return reserveCollateralUSD
      }
    }
  }
  return BIG_DECIMAL_ZERO
}