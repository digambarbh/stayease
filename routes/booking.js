
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


router.get("/new/:id", checkAuth, async (req, res) => {
    const { id } = req.params
    const stay = await Stay.findById(id)
    res.render("booking/booking", { stay })
})






router.post("/:id", checkAuth, async (req, res) => {
    const { id } = req.params
    const stay = await Stay.findById(id)
    const { guests } = req.body
    const checkIn = new Date(req.body.checkIn)
    const checkOut = new Date(req.body.checkOut)
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
    res.redirect("/user/my/bookings")
})


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








router.post("/verify", checkAuth, async (req, res) => {
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
})

module.exports = router