import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import ServiceProvider from "../../model/serviceProviderModel.js"






export const login=async(req,res)=>{
    const {email,password}=req.body;

    if(!email || !password) {
        return res.json({success:false,msg:"Email and passwords are required"});
    }
    try{
        const user = await ServiceProvider.findOne({email});

        if(!user) return res.json({success:false,msg:"User doesnot exists"});

        const isMatched=await bcrypt.compare(password,user.password);
        
        if(!isMatched) {
             return res.json({success:false,msg:"Invalid password or email"});
        }

    const token=jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});

     res.cookie('token',token,{
        httpOnly:true,
        secure:process.env.NODE_ENV==='production',
        sameSite: process.env.NODE_ENV==='production'?'none':'strict',
        maxAge: 7*24*60*60*1000,
     }); 


     return res.json({success:true,msg:"User Logged in succesfully",user,token});

    }
    catch(err) {
        res.json({success:false,msg:"Login Failed"});
    }
}


export default login;
