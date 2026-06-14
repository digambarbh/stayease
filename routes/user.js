const express = require('express')
const router = express.Router()
const User = require("../model/user")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const Blacklist=require("../model/blacklist")
const checkAuth=require("../middleware/auth")
const Stay=require("../model/stay")
const multer = require("multer")
const Booking = require('../model/booking')
require('dotenv').config()
const { cloudinary, storage } = require("../cloudinary")
const upload = multer({ storage })


router.get('/register', (req, res) => {
    res.render("user/register")
})

router.post('/register', async (req, res) => {
    const { username, email, phone, role } = req.body
    const password = await bcrypt.hash(req.body.password, 12)
    const user = await User.insertOne({ username, email, phone, password, role })
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const cookieOption = {
        httpOnly: true,
        secure: false,
    }
    res.cookie("token",token,cookieOption)
    res.status(201).json({message:"registerd successfully"})

    // res.redirect("/")
})



router.get("/login", (req, res) => {
    const redirect = req.query.redirect || '/'
    res.render("user/login", { redirect })
})


router.post("/login", async (req, res) => {
    const { email, password, redirect } = req.body
    const user = await User.findOne({ email: email })
    if (!user) {
        throw Error("username or password incorrect")
    }
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
        throw Error("username or password incorrect")
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const cookieOption = {
        httpOnly: true,
        secure: false,
    }
    res.cookie("token", token, cookieOption)
    res.redirect(redirect || req.query.redirect || '/')
})


router.post("/logout",async(req,res)=>{
    const token = req.cookies.token;
    
    if(!token){
       return res.send("already logged out")
    }
    res.clearCookie("token",{httpOnly: true});
    await Blacklist.findOneAndUpdate({token},{token},{upsert:true})
    res.redirect("/")
})

router.get("/my/bookings",checkAuth,async(req,res)=>{
    const id=req.user;
    const user=await User.findById(id).populate("bookings")
    // console.log(user)
    const bookings=user.bookings;
    const stayId=bookings.map(booking=>booking.stay)
    console.log(stayId)
    if(!stayId){
         return res.send("You have no booking !!! ")
    }
    const stays=await Stay.find({
        _id:{$in:stayId}
    })
    // console.log(stay)
    res.render('user/myBookings',{stays})
})

router.get("/my/bookings/:id",checkAuth,async(req,res)=>{
   const {id}=req.params
   const user=req.user;
   const bookings=await Booking.find({
    stay:id,
    user:user
   })
   
   res.render('user/bookingDetail',{bookings})
})

router.get("/profile",checkAuth,async(req,res)=>{
    const user=await User.findById(req.user)
    .populate("bookings")
    .populate('stay')
    console.log(user)
    res.render("user/profile",{user})
})


module.exports = router
