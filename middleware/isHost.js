const User=require("../model/user")

const isHost=async(req,res,next)=>{
    const user=await User.findById(req.user)
    // Error: if user is null, user.role crashes.
    if(!user){
        return res.redirect("/user/login")
    }
    if(user.role!=="host" ){
        return res.send("you are not a host")
    }
    next()
}


module.exports=isHost
