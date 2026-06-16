
require("dotenv").config()
const express = require('express')
const crypto = require('crypto')
const Stay = require('../model/stay')
const Booking = require('../model/booking')
const jwt = require('jsonwebtoken')
const router = express.Router()
const checkAuth = require("../middleware/auth")
const User = require("../model/user")
const razorpay = require("../utility/razorpay")
const catchAsync = require("../utility/catchAsync")
const { validateBooking, validateVerifyPayment } = require("../middleware/validate");


router.get("/new/:id", checkAuth, catchAsync(async (req, res) => {
    const { id } = req.params
    const stay = await Stay.findById(id)

    const existingBookings = await Booking.find({
        stay: id,
        status: { $nin: ['cancelled', 'rejected'] }
    }).select('checkIn checkOut');
    
    const bookedRanges = JSON.stringify(existingBookings.map(b => ({
        checkIn: b.checkIn,
        checkOut: b.checkOut
    })));

    res.render("booking/booking", { stay, bookedRanges })
}))






router.post("/:id", checkAuth, validateBooking, catchAsync(async (req, res) => {
    const { id } = req.params
    const stay = await Stay.findById(id)
    const { guests } = req.body
    const checkIn = new Date(req.body.checkIn)
    const checkOut = new Date(req.body.checkOut)

    const conflictingBooking = await Booking.findOne({
        stay: id,
        status: { $nin: ['cancelled', 'rejected'] },
        $and: [
            { checkIn: { $lt: checkOut } },
            { checkOut: { $gt: checkIn } }
        ]
    });
    
    if (conflictingBooking) {
        res.cookie("flash", { type: "danger", message: "These dates are already booked. Please select different dates." });
        return res.redirect(`/bookings/new/${id}`);
    }
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
    const totalPrice = nights * stay.price
    const booking = new Booking({ checkIn, checkOut, guests, totalPrice, nights })
    booking.user = req.user
    booking.stay = stay._id
    booking.host = stay.host
    const user=await User.findById(req.user)
    user.bookings.push(booking._id)
    await user.save()
    await booking.save()
    res.cookie("flash",{type:"success",message:"Stay booked . Happy Journey"})
    res.redirect("/user/my/bookings")
}))


// router.post("/:id/pay", checkAuth, async (req, res) => {
//     const { id } = req.params
//     const stay = await Stay.findById(id)
//     if (!stay) return res.status(404).send("Stay not found")

//     const { checkIn, checkOut, guests, totalPrice, nights } = req.body
//     const amount = Number(totalPrice) * 100

//     const options = {
//         amount,
//         currency: "INR",
//         receipt: `booking_${Date.now()}`
//     }
//     const order = await razorpay.orders.create(options)

//     const bookingData = {
//         stayId: id,
//         checkIn,
//         checkOut,
//         guests,
//         totalPrice,
//         nights
//     }

//     res.render("booking/payment", { order, bookingData, key_id: process.env.RAZORPAY_KEY_ID })
// })








router.post("/verify", checkAuth, validateVerifyPayment, catchAsync(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        stayId,
        checkIn,
        checkOut,
        guests,
        totalPrice,
        nights
    } = req.body

    const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex")

    if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment verification failed" })
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const conflictingBooking = await Booking.findOne({
        stay: stayId,
        status: { $nin: ['cancelled', 'rejected'] },
        $and: [
            { checkIn: { $lt: checkOutDate } },
            { checkOut: { $gt: checkInDate } }
        ]
    });
    
    if (conflictingBooking) {
        return res.status(400).json({ success: false, message: "These dates were just booked by someone else." });
    }

    const stay = await Stay.findById(stayId)
    if (!stay) return res.status(404).json({ success: false, message: "Stay not found" })

    const booking = new Booking({
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guests: Number(guests),
        totalPrice: Number(totalPrice),
        nights: Number(nights),
        user: req.user,
        stay: stayId,
        host: stay.host,
        status: 'approved',
        payment: {
            status: 'paid',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id
        }
    })

    await booking.save()

    const user = await User.findById(req.user)
    if (user) {
        user.bookings.push(booking._id)
        await user.save()
    }

    res.json({ success: true })
}))

module.exports = router