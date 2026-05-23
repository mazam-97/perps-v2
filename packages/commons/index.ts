export type ToEngine ={
    command: "onramp",
    userId: string,
    amount: string
} | {
    command: "create_order",
    userid: string,
    qty: string,
    price: string,
    marketid: string,
    margin: string,
    slippage: string,
    side: "long" | "short",
    type: "limit" | "market",
    orderId: string
    
} | {
    command: "cancel_order",
    orderId: string,
    userId: string
} | {
    command: "create_market",
    market_id: string
}