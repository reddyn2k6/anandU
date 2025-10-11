import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import ServiceProvider from "../../model/serviceProviderModel.js"


export const register=async(req,res)=>{
       const {name,email,password,gender,phone,location}=req.body;

    if(!name || !email || !password) {
        return res.status(300).json({success:false,msg:'Details missing'});
    }  

    try{ 
        
        const existingUser= await ServiceProvider.findOne({email});
        if(existingUser) return res.json({success:false,msg:"User ALready Exists"});


     const hashedPassword= await bcrypt.hash(password,10);

     const user=new ServiceProvider({name,email,password:hashedPassword,gender,phone,location});

     await user.save();
      
     const token=jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});

    res.cookie('token',token,{
        httpOnly:true,
        secure:process.env.NODE_ENV==='production',
        sameSite: process.env.NODE_ENV==='production'?'none':'strict',
        maxAge: 7*24*60*60*1000,
     });
    return res.status(200).json({success:true,msg:"Register Successfull",user,token});
    }

    catch(err) {
        res.json({success:false,msg:err.message});
    }
       
}


export default register;