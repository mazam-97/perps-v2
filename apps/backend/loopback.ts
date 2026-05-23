import type { ToEngine } from "commons"
import { createClient } from "redis";
const publisher = createClient();
publisher.connect();

const subscriber = createClient();
subscriber.connect();
const unresolvedOrder = new Map<string, (value:any)=>void>();
const BACKEND_CONSUMER_GROUP = "backend";
// subscriber.xGroupCreate("to-backend",BACKEND_CONSUMER_GROUP,"$",{
//     MKSTREAM: true
// })
export const loopback =  (message: ToEngine)=>{  
    return new Promise(async (resolve, reject)=>{
        const correlationId = crypto.randomUUID().toString();
        console.log(`publishing message to the queue`);
        await publisher.xAdd("engine","*",{correlationId , ...message});
        unresolvedOrder.set(correlationId,resolve)
        setTimeout(()=>{
            if(unresolvedOrder.has(correlationId)){
                reject();
            }
        },20000)
    })
}

export const startLoopbackListener = async()=>{

while(1){
   const response = await subscriber.xReadGroup(BACKEND_CONSUMER_GROUP,BACKEND_CONSUMER_GROUP, [{
        key: "to-backend",
        id: ">"
    }],{
        BLOCK: 0,
        COUNT: 1
    })

    const message = response[0].messages[0].message as unknown as any;
    if(message){
        console.log(`received message from engine ${JSON.stringify(message)}`);
         unresolvedOrder.get(message.correlationId as unknown as string)(message); 
         unresolvedOrder.delete(message.correlationId);
    }

}
}