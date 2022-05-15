# Standard Tech Subgraph

Aims to deliver analytics & historical data for Standard Tech. Still a work in progress. Feel free to contribute!

The Graph exposes a GraphQL endpoint to query the events and entities within the SushiSwap ecosytem.

Current subgraph locations:

1. **Vault**: Includes all Standard's Vault, Exchange data, etc:


## To setup and deploy

For any of the subgraphs: `Standard`as `[subgraph]`

1. Run the `yarn run codegen:[subgraph]` command to prepare the TypeScript sources for the GraphQL (generated/schema) and the ABIs (generated/[ABI]/\*)
2. [Optional] run the `yarn run build:[subgraph]` command to build the subgraph. Can be used to check compile errors before deploying.
3. Run `graph auth https://api.thegraph.com/deploy/ <ACCESS_TOKEN>`
4. Deploy via `yarn run deploy:[subgraph]`.


