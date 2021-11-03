import { Address, ethereum } from "@graphprotocol/graph-ts";
import { BIG_DECIMAL_1E18, BIG_INT_ONE_DAY_SECONDS } from "const";
import { getBundle, getToken } from ".";
import { BondedStrategy, BondedStrategyHistory } from "../../generated/schema";
import { getBondedStrategy } from "./bondedStrategy";

export function getBondedStrategyHistory(block: ethereum.Block): BondedStrategyHistory {
    const day = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS)
    const bondedStrategy = getBondedStrategy(block)
    const id = bondedStrategy.id.concat('-').concat(day.toString())
    
    let history = BondedStrategyHistory.load(id)
    
    if (history === null) {
        const bundle = getBundle()
        const stnd = getToken(bondedStrategy.stnd as Address)

        history = new BondedStrategyHistory(id)
        history.timeframe = 'Day'
        history.date = day.toI32() * 86400

        history.bondedStrategy = bondedStrategy.id

        history.totalClaimedUSD = bondedStrategy.totalClaimedUSD

        history.totalSupply = bondedStrategy.totalSupply
        const totalSupplyDecimals = bondedStrategy.totalSupply.divDecimal(BIG_DECIMAL_1E18)
        history.totalSupplyUSD = totalSupplyDecimals.times(stnd.derivedETH).times(bundle.ethPrice)

        history.totalClaimedUSD = bondedStrategy.totalClaimedUSD

        history.remainingRewardETH = bondedStrategy.remainingRewardETH
        history.remainingRewardUSD = bondedStrategy.remainingRewardETH.times(bundle.ethPrice)

        history.usersCount = bondedStrategy.usersCount
    }

    history.block = block.number
    history.timestamp = block.timestamp
    
    history.save()

    return history as BondedStrategyHistory
}