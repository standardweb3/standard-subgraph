import { Address, BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import { Candle, CDP, Pair, UsmPairCollateralMapper } from '../generated/schema'
import { Pair as PairContract } from '../generated/templates/Vault/Pair'
import { concat } from '@graphprotocol/graph-ts/helper-functions'
import { Liquidated } from '../generated/VaultManager/Vault'
import { BIG_DECIMAL_1E18, BIG_DECIMAL_ZERO, MTR_ADDRESS } from 'const'

export function onLiquidated(event: Liquidated): void {
    const usmPairCollateralMapper = UsmPairCollateralMapper.load(event.params.collateral.toHex())
    const cdp = CDP.load(event.params.collateral.toHex())
    const liquidateAmount = event.params.amount
  
    const pair = Pair.load(usmPairCollateralMapper.pair)
    const pairContract = PairContract.bind(Address.fromString(pair.id))
    const result = pairContract.try_getReserves()
  
    if (!result.reverted) {
      const isToken0Mtr = pair.token0.equals(MTR_ADDRESS)
  
      let mtrReserve = BIG_DECIMAL_ZERO
      let collateralReserve = BIG_DECIMAL_ZERO
      let price = BIG_DECIMAL_ZERO
      if (isToken0Mtr) {
        // token0
        mtrReserve = result.value.value0.toBigDecimal().div(BIG_DECIMAL_1E18)
        // token 1
        collateralReserve = result.value.value1.toBigDecimal().div(cdp.decimals)
        price = mtrReserve.div(collateralReserve)
      } else {
        // token 1
        mtrReserve = result.value.value1.toBigDecimal().div(BIG_DECIMAL_1E18)
        // token 0
        collateralReserve = result.value.value0.toBigDecimal().div(cdp.decimals)
        price = collateralReserve.div(mtrReserve)
      }
  
      let tokens = concat(pair.token0, pair.token1)
      let timestamp = event.block.timestamp.toI32()
  
      let periods: i32[] = [5 * 60, 15 * 60, 60 * 60, 4 * 60 * 60, 24 * 60 * 60, 7 * 24 * 60 * 60]
      for (let i = 0; i < periods.length; i++) {
        let time_id = timestamp / periods[i]
        let candle_id = concat(concat(Bytes.fromI32(time_id), Bytes.fromI32(periods[i])), tokens).toHex()
        let candle = Candle.load(candle_id)
        if (candle === null) {
          candle = new Candle(candle_id)
          candle.time = timestamp
          candle.period = periods[i]
          candle.pair = event.address
          candle.token0 = pair.token0
          candle.token1 = pair.token1
          candle.open = price
          candle.low = price
          candle.high = price
          candle.token0TotalAmount = BigInt.fromI32(0)
          candle.token1TotalAmount = BigInt.fromI32(0)
        } else {
          if (price < candle.low) {
            candle.low = price
          }
          if (price > candle.high) {
            candle.high = price
          }
        }
  
        candle.close = price
  
        candle.lastBlock = event.block.number.toI32()
  
        if (isToken0Mtr) {
          candle.token1TotalAmount = candle.token1TotalAmount.plus(liquidateAmount)
        } else {
          candle.token0TotalAmount = candle.token0TotalAmount.plus(liquidateAmount)
        }
  
        candle.save()
      }
    }
  }