import type { ToEngine } from "commons";
import { createClient } from "redis";

const client = createClient();

client.connect();

const publisher = createClient();
await publisher.connect();

const processEngineRequest = (message: ToEngine) =>{
    switch(message.command){
        case "onramp":{
            return {
                amount: message.amount
            }
        }
        case "create_order":{

        }
        case "cancel_order":{

        }
        case "create_market":{

        }
        break;
    }

}

// client.xGroupCreate("engine","engine","$",{
//     MKSTREAM: true
// })
while(1){
    const response = await client.xReadGroup("engine","engine",[{
        key: "engine",
        id:  ">"
    }], {
        BLOCK: 100,
        COUNT: 1
    });

    if(!response){
        console.log(`nothing found`);
        continue;
    }
    console.log(`response from queue ${JSON.stringify(response)}`);
    const message = response[0].messages[0].message as unknown as any;
    const correlationId = message.correlationId;
    console.log(`processing message ${JSON.stringify(message)}`);
    const res =  processEngineRequest(message);
    console.log(`publishing response to the queue ${JSON.stringify(res)}`);
    await publisher.xAdd("to-backend", "*",{correlationId, ...res});
}