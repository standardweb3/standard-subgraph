import { Address, ethereum } from "@graphprotocol/graph-ts";
import { BIG_DECIMAL_ZERO, BIG_INT_ONE, BIG_INT_ZERO } from "const";
import { User } from "../../generated/schema";
import { getVaultManager } from "./vaultManager";

export function getUser(address: Address, block: ethereum.Block): User {
    let user = User.load(address.toHex())

    if (user === null) {
        // increase user count (historic)
        const manager = getVaultManager(block)
        manager.historicUserCount = manager.historicUserCount.plus(BIG_INT_ONE)
        manager.activeUserCount = manager.activeUserCount.plus(BIG_INT_ONE)
        manager.save()

        user = new User(address.toHex())

        user.currentBorrowed = BIG_DECIMAL_ZERO
        user.historicBorrowed = BIG_DECIMAL_ZERO
        user.historicPaidBack = BIG_DECIMAL_ZERO
        
        user.historicVaultCount = BIG_INT_ZERO
        user.activeVaultCount = BIG_INT_ZERO
        user.liquidateCount = BIG_INT_ZERO
    }

    user.block = block.number
    user.timestamp = block.timestamp

    user.save()

    return user as User
}