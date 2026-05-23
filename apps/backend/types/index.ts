
import {z} from "zod"
export const SignupSigninSchema = z.object({
    username: z.string(),
    password: z.string()
})

export const MarketSchema = z.object({
    imageUri: z.string(),
    symbol: z.string()
});

export const onRampSchema = z.object({
    amount: z.string()
   // userId: z.string()
});


export const CreateOrderSchema = z.object({
    //userId: z.string(),
    //margin: z.string(),
    qty: z.string(),
    price: z.string(),
    market_id: z.string(),
    slippage: z.string(),
    margin: z.string(),
    type: z.enum(["limit","market"]),
    side: z.enum(["long","short"])
})
