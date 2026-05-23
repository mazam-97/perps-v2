import {type Request, type Response, type NextFunction} from "express";
import express from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) =>{

const token = req.headers.token as string;

  try{
      
      const decoded = jwt.verify(token,process.env.JWT_SECRET!) as JwtPayload
    
      if(decoded){
          req.userId = (decoded as {userId:string}).userId 
          next();
      }
      else{
        res.status(403).json({
            message: "Incorrect token"
        })
      }
  }
  catch(e){
    res.status(403).json({
        message: "Incorrect token"
    })
  }


}

