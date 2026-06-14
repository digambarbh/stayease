const mongoose=require('mongoose')
require('dotenv').config()

const connectDb=()=>{
    mongoose
    .connect(process.env.DATABASE_URL)
    .then(()=>{
        console.log("database connection to stayease success")
    })
    .catch((e)=>{
        console.error(e.message)
    })
}



module.exports=connectDb