import { Address, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from 'const'
import { BondedStrategyToken, Token } from '../../generated/schema'

export function getBondedStrategyToken(tokenId: Address, block: ethereum.Block): BondedStrategyToken {
  let token = BondedStrategyToken.load(tokenId.toHex())

  if (token === null) {
    let exchangeToken = Token.load(tokenId.toHex())
    if (exchangeToken === null) {
      token.isPair = true
      token.pair = tokenId.toHex()
    } else {
      token.isPair = false
      token.token = tokenId.toHex()
    }
    token.claimedReward = BIG_INT_ZERO
    token.claimedRewardUSD = BIG_DECIMAL_ZERO

    token.remainingReward = BIG_INT_ZERO
    token.remainingRewardETH = BIG_DECIMAL_ZERO
  }

  token.block = block.number
  token.timestamp = block.timestamp

  token.save()

  return token as BondedStrategyToken
}
