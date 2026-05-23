import  express  from "express";
import {prisma} from "db";
import bcrypt from "bcrypt"
import { CreateOrderSchema, MarketSchema, onRampSchema, SignupSigninSchema } from "./types";
import jwt from "jsonwebtoken";
import { authMiddleware } from "./middleware";
import {type ToEngine} from "commons"
import { loopback, startLoopbackListener, } from "./loopback";
const app = express();
console.log(`hi`);
app.use(express.json());
app.post("/api/v1/signup", async (req, res)=>{
 console.log(`Hi`);
    //const {username, password} = req.body;
    const parsedBody = SignupSigninSchema.safeParse(req.body);
    if(!parsedBody.success || !parsedBody.data){
        res.status(411).json({
            message : "Invalid body"
        })
        return
    }
    const {username, password} = parsedBody.data;
    const encryptedPassword = await bcrypt.hash(password,10);
    console.log(`encryprtd password ${encryptedPassword}`)
    const response = await prisma.user.create({
        data:{
            username: username,
            password: encryptedPassword
        }
    });
    res.status(200).json({
        id : response.id
    })
})


app.post("/api/v1/signin",async(req,res)=>{
const parsedBody = SignupSigninSchema.safeParse(req.body);
   if(!parsedBody.success){
    return res.status(411).json({
        message: "invalid body"
    })
   }
   const userExists = await prisma.user.findFirst({
    where:{
        username : parsedBody.data.username,
    }
   })

   if(!userExists){
    return res.status(400).json({
        message : "user does not exist"
    })
   }

   const isVaidated = await bcrypt.compare(parsedBody.data.password,userExists.password);

   if(!isVaidated){
    return res.status(401).json({
        message : "incorrect password"
    })
   }

   const token = jwt.sign({
    userId: userExists.id
   }, process.env.JWT_SECRET as string)

return res.status(200).json({
    token,
    message : "successfully signedin"
});

})


app.post("/api/v1/onramp",authMiddleware,async(req, res)=>{
    const userId = req.userId;
    const parsedSchema = onRampSchema.safeParse(req.body);

    if(!parsedSchema.success){
        res.status(411).json({
            message: "Invalid body",
            error: parsedSchema.error.message as string
        })
        return;
    }
    const payload: ToEngine = {
        command: "onramp",
        userId: req.userId as string,
        amount: parsedSchema.data.amount
    }
    console.log(`calling loopback`);
    const response = await loopback(payload);
    console.log(`response from loopback ${JSON.stringify(response)}`);
    res.status(200).json({ message: "onramp request queued", response });

})

app.post("/api/v1/order",authMiddleware, async(req, res)=>{
    const userId = req.userId as string;
    const parsedBody = CreateOrderSchema.safeParse(req.body);
    if(!parsedBody.success){
    res.status(411).json({
        meesage: "Invalid body"
    })
    return;
    }
    const payload: ToEngine ={
        command: "create_order",
        userid: userId,
        margin: parsedBody.data.margin,
        price: parsedBody.data.price,
        slippage: parsedBody.data.slippage,
        marketid: parsedBody.data.market_id,
        orderId: crypto.randomUUID(),
        qty: parsedBody.data.qty,
        side: parsedBody.data.side,
        type: parsedBody.data.type
    }
    
    const response = await loopback(payload);
    console.log(`response from loopback ${JSON.stringify(response)}`);
    res.status(200).json({ message: "order request queued"+ response });
});


app.post("/api/v1/admin/market", async(req, res)=>{
    const parsedBody = MarketSchema.safeParse(req.body);
   const token = req.headers.token;
  if(token != process.env.ADMIN_SECRET){
        res.status(403).json({
            message :"unauthenticated"
        })
        return;
    }
    if(!parsedBody.success){
        res.status(411).json({
            message: "invalid body"
        });
        return;
    }

    const {imageUri, symbol}= parsedBody.data;
    const market = await prisma.market.create({
        data:{
            imageUri: imageUri,
            slug: symbol
        }
    })

    res.status(200).json({
        message : `${market.slug} created`
    })
})
// app.post("/api/v1/order",(req,res)=>{

// })



app.listen(3000,()=>{
    console.log(`it is listening to port 3000`);
});

startLoopbackListener();