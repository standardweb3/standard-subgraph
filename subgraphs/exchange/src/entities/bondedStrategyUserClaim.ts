import { Address } from "@graphprotocol/graph-ts";
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "const";
import { BondedStrategyUserClaim } from "../../generated/schema";

export function getBondedStrategyUserClaim(userId: string, pairId: Address): BondedStrategyUserClaim {
    const id = userId.concat('-').concat(pairId.toHex())
    let userClaim = BondedStrategyUserClaim.load(id)

    if (userClaim === null) {
        userClaim = new BondedStrategyUserClaim(id)
        userClaim.user = userId
        userClaim.pair = pairId
        
        userClaim.lastClaimed = BIG_INT_ZERO
        userClaim.amount = BIG_INT_ZERO
        userClaim.amountUSD = BIG_DECIMAL_ZERO
    }

    userClaim.save()

    return userClaim as BondedStrategyUserClaim
}