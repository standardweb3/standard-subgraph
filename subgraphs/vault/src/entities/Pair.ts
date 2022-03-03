import { Address, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO } from 'const'
import { getSymbol } from '../../../exchange-dev/src/entities'
import { Pair } from '../../generated/schema'
import { Pair as PairContract } from '../../generated/templates/Pair/Pair'

export function createPair(
  address: Address,
  block: ethereum.Block = null,
  token0FromParams: Address = null,
  token1FromParams: Address = null,
  isToken0Mtr: boolean = false
): Pair | null {
  let pair = Pair.load(address.toHex())

  if (pair === null) {
    const pairContract = PairContract.bind(address)

    const token0Address = token0FromParams || pairContract.token0()
    const token0 = token0Address

    if (token0 === null) {
      return null
    }

    const token1Address = token1FromParams || pairContract.token1()
    const token1 = token1Address

    if (token1 === null) {
      return null
    }

    pair = new Pair(address.toHex())

    pair.address = address.toHex()

    pair.isToken0Mtr = isToken0Mtr
    pair.symbolToken0 = getSymbol(token0Address)
    pair.symbolToken1 = getSymbol(token1Address)

    pair.token0 = token0
    pair.token1 = token1

    pair.reserve0 = BIG_DECIMAL_ZERO
    pair.reserve0USD = BIG_DECIMAL_ZERO
    pair.reserve1 = BIG_DECIMAL_ZERO
    pair.reserve1USD = BIG_DECIMAL_ZERO

  }

  pair.timestamp = block.timestamp
  pair.block = block.number
  pair.save()

  return pair as Pair
}
