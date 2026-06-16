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
const catchAsync= require("../utility/catchAsync")
const AuthLimiter=require("../middleware/authLimiter")
const isHost = require("../middleware/isHost")
const booking = require('../model/booking')
const { validateRegister, validateLogin } = require("../middleware/validate");


router.get('/register', (req, res) => {
    res.render("user/register")
})

router.post('/register', validateRegister, async (req, res, next) => {
    try {
        const { username, email, phone, role } = req.body
        const password = await bcrypt.hash(req.body.password, 12)
        const user = await User.create({ username, email, phone, password, role })
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
        const cookieOption = {
            httpOnly: true,
            secure: false,
        }
        res.cookie("token",token,cookieOption)
        res.cookie("flash",{type:"success",message:"Welcome to StayEase"})
        res.redirect("/user/profile")
    } catch (error) {
        if (error.code === 11000) {
            let field = Object.keys(error.keyValue)[0];
            let message = field === 'email' ? 'Email already registered. Please login.' : 'Username already taken. Please try another.';
            res.cookie("flash", { type: "danger", message: message })
            return res.redirect("/user/register")
        }
        next(error)
    }
})



router.get("/login", (req, res) => {
    const redirect = req.query.redirect || '/'
    res.render("user/login", { redirect })
})


router.post("/login",AuthLimiter, validateLogin, catchAsync(async (req, res) => {
    const { email, password, redirect } = req.body
    const user = await User.findOne({ email: email })
    if (!user) {
        res.cookie("flash",{type:"danger",message:"username or password incorrect"})
        return res.redirect("/user/login")
    }
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
        res.cookie("flash",{type:"danger",message:"username or password incorrect"})
        return res.redirect("/user/login")
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const cookieOption = {
        httpOnly: true,
        secure: false,
    }
    res.cookie("token", token, cookieOption)
    res.cookie("flash",{type:"success",message:"Welcome Back"})
    res.redirect(redirect || req.query.redirect || '/')
}))


router.post("/logout",catchAsync(async(req,res)=>{
    const token = req.cookies.token;
    
    if(!token){
       return res.send("already logged out")
    }
    res.clearCookie("token",{httpOnly: true});
    await Blacklist.findOneAndUpdate({token},{token},{upsert:true})
    res.cookie("flash",{type:"success",message:" Good bye ..."})
    res.redirect("/")
}))

router.get("/my/bookings",checkAuth,catchAsync(async(req,res)=>{
    const id=req.user;
    const user=await User.findById(id).populate("bookings")
    const bookings=user.bookings;
    const stayId=bookings.map(booking=>booking.stay)
    if(!stayId){
         return res.send("You have no booking !!! ")
    }
    const stays=await Stay.find({
        _id:{$in:stayId}
    })
    res.render('user/myBookings',{stays})
}))

router.get("/my/bookings/:id",checkAuth,catchAsync(async(req,res)=>{
   const {id}=req.params
   const user=req.user;
   const bookings=await Booking.find({
    stay:id,
    user:user
   })
   
   res.render('user/bookingDetail',{bookings})
}))

router.get("/profile",checkAuth,catchAsync(async(req,res)=>{
    const user=await User.findById(req.user)
    .populate("bookings")
    .populate('stay')
    res.render("user/profile",{user})
}))


router.get("/wishlist",checkAuth,catchAsync(async(req,res)=>{
    const userId = req.user
    const user = await User.findById(userId).populate("wishlist")
    const wishlist = user.wishlist
    res.render("user/wishlist",{wishlist})

}))

router.get("/wishlist/:id",checkAuth,catchAsync(async(req,res)=>{
   await User.findByIdAndUpdate(
    req.user,
    {
        $addToSet:{wishlist:req.params.id}
    }
   );
   res.cookie("flash",{type:"success",message:"Added to Wishlist"})
   res.redirect(`/stays/${req.params.id}`)
}))

router.get("/host/dashboard",checkAuth,isHost,catchAsync(async(req,res)=>{
    const hostStays = await Stay.find({ host: req.user });
    
    const bookings = await Booking.find({
        host: req.user
    })
    .populate("user")
    .populate("stay");

    const totalStays = hostStays.length;
    const totalBookings = bookings.length;
    
    // Calculate total earnings, excluding cancelled and rejected bookings
    const validBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected');
    const totalEarnings = validBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // Calculate bookings per stay
    const stayStats = hostStays.map(stay => {
        const stayBookings = bookings.filter(b => b.stay && b.stay._id.toString() === stay._id.toString());
        const earnings = stayBookings
            .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        
        return {
            stay: stay,
            bookingCount: stayBookings.length,
            earnings: earnings
        };
    });

    res.render("user/hostdashboard", {
        totalStays,
        totalBookings,
        totalEarnings,
        stayStats
    });
}))

router.get("/host/stay/:id/bookings", checkAuth, isHost, catchAsync(async(req, res) => {
    const stayId = req.params.id;
    
    // Verify the host owns this stay
    const stay = await Stay.findOne({ _id: stayId, host: req.user });
    if (!stay) {
        res.cookie("flash", { type: "danger", message: "Stay not found or you are not the host." });
        return res.redirect("/user/host/dashboard");
    }

    const bookings = await Booking.find({ stay: stayId, host: req.user })
        .populate("user")
        .sort({ createdAt: -1 });

    res.render("user/hoststaybookings", { stay, bookings });
}));

module.exports = router
