import { Address } from "@graphprotocol/graph-ts";
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "const";
import { BondedStrategyUserClaim } from "../../generated/schema";

export function getBondedStrategyUserClaim(userId: string, tokenId: Address, isPair: boolean): BondedStrategyUserClaim {
    const id = userId.concat('-').concat(tokenId.toHex())
    let userClaim = BondedStrategyUserClaim.load(id)

    if (userClaim === null) {
        userClaim = new BondedStrategyUserClaim(id)
        userClaim.user = userId
        userClaim.token = tokenId
        userClaim.isPair = isPair;
        
        userClaim.lastClaimed = BIG_INT_ZERO
        userClaim.amount = BIG_INT_ZERO
        userClaim.amountUSD = BIG_DECIMAL_ZERO
    }

    userClaim.save()

    return userClaim as BondedStrategyUserClaim
}