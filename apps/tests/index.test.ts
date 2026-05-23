import axios, { AxiosError } from "axios";
import { password } from "bun";

import {beforeAll, describe, expect, it} from "bun:test"
import { execPath } from "node:process";
import { isAwaitExpression } from "typescript";


describe("authtest",()=>{
    let token = "";
    // beforeAll(async ()=>{
    //     const temp = Math.random();
    //     const response = await axios.post(`${process.env.BACKEND_URL}/signup`,{
    //        username: "dilshad"+ temp,
    //        password: "asdfasdf"
    //     });
    //     token = response.data.token;
    // });
   console.log('Hi')

    it("signup with only username",async ()=>{
        
        try{
            console.log('signup with username');
            console.log(`backendurl ${process.env.BACKEND_URL}`);
            const response = await axios.post(`${process.env.BACKEND_URL}/signup`,{
                username: "dilshad"+Math.random()
            });

            expect().fail();
        }
        catch(e){
            if(e  instanceof AxiosError){

                expect(e.status).toBe(404);
                return;

            }

            expect().fail()
        }

    });

    it("signup should pass", async()=>{
        
        const response = await axios.post(`${process.env.BACKEND_URL}/api/v1/signup`,{
            username: "Dilshad",
            password: "1243123"
        })

        expect(response.status).toBe(200);
    })

    it("signin should be successful", async()=>{
        const response = await axios.post(`${process.env.BACKEND_URL}/api/v1/signin`,{
            username : "Dilshad",
            password: "1243123"
        })

        expect(response.status).toBe(200)
    })
})


describe("order endpoints", ()=>{
    const user1 = "dilshad"+Math.random();
    const user2 = "dilshad"+Math.random();
    let user1Token = "";
    let user2token = ""
    const marketId = ""
    beforeAll(async ()=>{
       const response = await axios.post(`${process.env.BACKEND_URL}/api/v1/signup`,{
        username: user1,
        password: "1234"
       });

        await axios.post(`${process.env.BACKEND_URL}/api/v1/signup`,{
        username: user2,
        password: "1234"
       });

       const signinResponse1 = await axios.post(`${process.env.BACKEND_URL}/api/v1/signin`,{
        username: user1,
        password: "1234"
       })

          const signinResponse2 = await axios.post(`${process.env.BACKEND_URL}/api/v1/signin`,{
        username: user2,
        password: "1234"
       })
        user1Token = signinResponse1.data.token;
        user2token = signinResponse2.data.token;

       await axios.post(`${process.env.BACKEND_URL}/api/v1/market`,{
        symbol: "SOL_USDC",
        imageUri: "ahsdflasjdfla"
       });

       await axios.post(`${process.env.BACKEND_URL}/api/v1/onramp`,{
        amount: 10000
       },{
        headers:{
            token: user1Token
        }
       })


       await axios.post(`${process.env.BACKEND_URL}/api/v1/onramp`,{
        amount: 10000
       },{
        headers:{
            token: user1Token
        }
       });

          await axios.post(`${process.env.BACKEND_URL}/api/v1/onramp`,{
        amount: 10000
       },{
        headers:{
            token: user2token
        }
       });
    })

    it("First order should sit on the order book with 0 filled qty",async ()=>{
        const response =  await axios.post(`${process.env.BACKEND_URL}/api/v1/order`,{
        price: 100,
        qty: 10,
        side: "long",
        marketId: marketId,
        type: "limit",
        margin: 1000,

       },{
        headers:{
            token: user1Token
        }
       })

       expect(response.status).toBe(200);
       expect(response.data.filledq).toBe(0);
       expect(response.data.orderId).toBeDefined();
    });

    it("Second Order sit on the order book if not matched ",async ()=>{
        const response = await axios.post(`${process.env.BACKEND_URL}/api/v1/order`,{
            price: 102,
            qty: 10,
            side: "short",
            marketId: marketId,
            type: "limit",
            margin: 100
        },{
            headers:{
                token: user2token
            }
        });

        expect(response.status).toBe(200);
        expect(response.data.filledQty).toBe(0);

    });


    it("Third order should match",async()=>{
        const response = await axios.post(`${process.env.BACKEND_URL}/api/v1/order`,{
            price:100,
            qty:10,
            marketId: marketId,
            type: "limit",
            side:"short",
            margin: 1000
        },{
            headers:{
                token: user2token
            }
        });

        expect(response.data.filledQty).toBe(10);
        expect(response.status).toBe(200)

    })
})