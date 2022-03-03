import { log } from '@graphprotocol/graph-ts'
import { FACTORY_ADDRESS } from "const";
import { Factory } from '../../generated/schema'

export function getFactory(): Factory {
    let factory = Factory.load(FACTORY_ADDRESS.toHex())
    if (factory === null) {
        factory = new Factory(FACTORY_ADDRESS.toHex())
        factory.pairs = []
    }
    factory.save()

    return factory as Factory
}