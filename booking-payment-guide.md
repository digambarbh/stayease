# Booking And Payment Guide

This guide explains how the booking relation should work in this project, then shows the flow for implementing bookings with Razorpay payment.

## Current Project Structure

Your important files are:

```txt
model/user.js
model/stay.js
model/booking.js

routes/user.js
routes/stay.js
routes/booking.js

views/booking/booking.ejs
server.js
middleware/auth.js
```

The booking feature should connect three main models:

```txt
User  -> the person who books a stay
Stay  -> the property being booked
Booking -> the booking record between user and stay
```

## Model Relations

### User To Booking

In `model/user.js`, each user can have many bookings:

```js
bookings: [{ type: Schema.Types.ObjectId, ref: 'Booking' }]
```

Meaning:

```txt
One User -> Many Bookings
```

Example:

```txt
Rahul booked Stay A
Rahul booked Stay B
Rahul booked Stay C
```

All those booking ids can be stored inside `user.bookings`.

## Stay To Booking

In `model/stay.js`, each stay can also have many bookings:

```js
bookings: [{ type: Schema.Types.ObjectId, ref: 'Booking' }]
```

Meaning:

```txt
One Stay -> Many Bookings
```

Example:

```txt
Ocean View Villa has booking from Rahul
Ocean View Villa has booking from Priya
Ocean View Villa has booking from Aman
```

All those booking ids can be stored inside `stay.bookings`.

## Booking To User, Stay, And Host

In `model/booking.js`, each booking should store:

```js
user: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true
},
stay: {
  type: Schema.Types.ObjectId,
  ref: 'Stay',
  required: true
},
host: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true
}
```

Meaning:

```txt
Booking belongs to one User
Booking belongs to one Stay
Booking belongs to one Host
```

The `host` is the owner of the stay. You store it directly in booking because later it becomes easy to show incoming booking requests to the host.

## Relationship Diagram

```txt
User
  _id
  username
  bookings: [bookingId]

Stay
  _id
  name
  price
  capacity
  host: userId
  bookings: [bookingId]

Booking
  _id
  checkIn
  checkOut
  guests
  nights
  totalPrice
  user: userId
  stay: stayId
  host: userId
  payment.status
  payment.razorpayOrderId
  payment.razorpayPaymentId
```

## Booking Model Changes

Your current booking model is good, but for your form you should add `nights` and `specialRequests`.

In `model/booking.js`:

```js
const bookingSchema = new Schema({
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, required: true },
  nights: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  specialRequests: { type: String },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },

  payment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String }
  },

  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  stay: {
    type: Schema.Types.ObjectId,
    ref: 'Stay',
    required: true
  },

  host: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true })
```

## Booking Route Flow

Your `server.js` should mount booking routes like this:

```js
app.use("/bookings", bookingRoute)
```

Then your route paths should be:

```txt
GET  /bookings/new/:id       show booking form
POST /bookings/:id           create booking and Razorpay order
POST /bookings/:id/verify    verify payment
GET  /bookings/my            show logged-in user's bookings
```

## Install Razorpay

Run:

```bash
npm install razorpay
```

Then add keys in `.env`:

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

## Basic Booking Route Setup

In `routes/booking.js`:

```js
const express = require('express')
const Razorpay = require('razorpay')
const crypto = require('crypto')

const Stay = require('../model/stay')
const Booking = require('../model/booking')
const User = require('../model/user')
const checkAuth = require('../middleware/auth')

const router = express.Router()

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})
```

## Show Booking Form

```js
router.get("/new/:id", checkAuth, async (req, res, next) => {
  try {
    const stay = await Stay.findById(req.params.id)

    if (!stay) {
      return res.send("Stay not found")
    }

    res.render("booking/booking", { stay })
  } catch (err) {
    next(err)
  }
})
```

Use `checkAuth` here because only logged-in users should book a stay.

## Create Booking And Razorpay Order

When the user submits `booking.ejs`, do this:

```js
router.post("/:id", checkAuth, async (req, res, next) => {
  try {
    const stay = await Stay.findById(req.params.id)

    if (!stay) {
      return res.send("Stay not found")
    }

    const booking = new Booking({
      checkIn: req.body.checkIn,
      checkOut: req.body.checkOut,
      guests: req.body.guests,
      nights: req.body.nights,
      totalPrice: req.body.totalPrice,
      specialRequests: req.body.specialRequests,
      user: req.user,
      stay: stay._id,
      host: stay.host
    })

    const order = await razorpay.orders.create({
      amount: Number(req.body.totalPrice) * 100,
      currency: "INR",
      receipt: `booking_${Date.now()}`
    })

    booking.payment.razorpayOrderId = order.id

    await booking.save()

    stay.bookings.push(booking._id)
    await stay.save()

    await User.findByIdAndUpdate(req.user, {
      $push: { bookings: booking._id }
    })

    res.render("booking/payment", {
      booking,
      order,
      key: process.env.RAZORPAY_KEY_ID
    })
  } catch (err) {
    next(err)
  }
})
```

Important: this is wrong:

```js
new Booking(req.body, { user: req.user }, { host: stay.host })
```

Because `new Booking()` needs one object containing all document fields.

Correct:

```js
new Booking({
  ...req.body,
  user: req.user,
  stay: stay._id,
  host: stay.host
})
```

## Payment Page

Create:

```txt
views/booking/payment.ejs
```

Example:

```ejs
<%- layout("/layouts/boilerplate.ejs") %>

<section class="container py-5">
  <div class="border rounded p-4 shadow bg-white mx-auto" style="max-width: 520px;">
    <h3 class="mb-3 text-center">Complete Payment</h3>

    <p class="text-muted text-center">
      Total Amount: &#8377;<%= booking.totalPrice %>
    </p>

    <button id="payBtn" class="btn btn-dark w-100">
      Pay Now
    </button>
  </div>
</section>

<script src="https://checkout.razorpay.com/v1/checkout.js"></script>

<script>
  const options = {
    key: "<%= key %>",
    amount: "<%= order.amount %>",
    currency: "INR",
    name: "Hotel Booking",
    description: "Booking Payment",
    order_id: "<%= order.id %>",
    handler: function (response) {
      const form = document.createElement("form")
      form.method = "POST"
      form.action = "/bookings/<%= booking._id %>/verify"

      const fields = {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      }

      for (const key in fields) {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = key
        input.value = fields[key]
        form.appendChild(input)
      }

      document.body.appendChild(form)
      form.submit()
    }
  }

  document.getElementById("payBtn").onclick = function () {
    const razorpay = new Razorpay(options)
    razorpay.open()
  }
</script>
```

## Verify Payment

After successful payment, Razorpay sends payment data to your backend. You must verify the signature.

```js
router.post("/:id/verify", checkAuth, async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body

    const body = razorpay_order_id + "|" + razorpay_payment_id

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      await Booking.findByIdAndUpdate(req.params.id, {
        "payment.status": "failed"
      })

      return res.send("Payment verification failed")
    }

    await Booking.findByIdAndUpdate(req.params.id, {
      "payment.status": "paid",
      "payment.razorpayPaymentId": razorpay_payment_id
    })

    res.redirect("/bookings/my")
  } catch (err) {
    next(err)
  }
})
```

## Show User Bookings

```js
router.get("/my", checkAuth, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user })
      .populate("stay")
      .populate("host")
      .sort({ createdAt: -1 })

    res.render("booking/my-bookings", { bookings })
  } catch (err) {
    next(err)
  }
})
```

You can create:

```txt
views/booking/my-bookings.ejs
```

## Host Booking Requests

Because every booking stores `host`, showing incoming bookings to a host becomes simple:

```js
router.get("/host", checkAuth, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ host: req.user })
      .populate("stay")
      .populate("user")
      .sort({ createdAt: -1 })

    res.render("booking/host-bookings", { bookings })
  } catch (err) {
    next(err)
  }
})
```

## Approve Or Reject Booking

```js
router.patch("/:id/approve", checkAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)

    if (!booking.host.equals(req.user)) {
      return res.send("You are not allowed to approve this booking")
    }

    booking.status = "approved"
    await booking.save()

    res.redirect("/bookings/host")
  } catch (err) {
    next(err)
  }
})

router.patch("/:id/reject", checkAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)

    if (!booking.host.equals(req.user)) {
      return res.send("You are not allowed to reject this booking")
    }

    booking.status = "rejected"
    await booking.save()

    res.redirect("/bookings/host")
  } catch (err) {
    next(err)
  }
})
```

## Fix Your Booking Form

In `views/booking/booking.ejs`, change this:

```ejs
max="<%= stay.maxGuests %>"
```

To this:

```ejs
max="<%= stay.capacity %>"
```

Because your `Stay` model uses `capacity`, not `maxGuests`.

Also make sure the hidden fields are filled before submit:

```ejs
<input type="hidden" name="totalPrice" id="totalPriceInput">
<input type="hidden" name="nights" id="nightsInput">
```

Your frontend already calculates those values, but your backend should still verify them again later for security.

## Backend Validation You Should Add Later

Do not fully trust hidden form fields. A user can edit them from the browser.

Before creating the booking, calculate price again on the server:

```js
const checkIn = new Date(req.body.checkIn)
const checkOut = new Date(req.body.checkOut)

const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
const totalPrice = nights * stay.price
```

Then use server-calculated values:

```js
nights,
totalPrice
```

Not only `req.body.nights` and `req.body.totalPrice`.

## Final Flow

```txt
1. User opens stay show page
2. User clicks Book Now
3. GET /bookings/new/:stayId renders booking form
4. User selects dates and guests
5. POST /bookings/:stayId creates pending booking
6. Server creates Razorpay order
7. User pays on Razorpay checkout
8. Razorpay sends payment response
9. POST /bookings/:bookingId/verify verifies signature
10. Booking payment.status becomes paid
11. User is redirected to /bookings/my
12. Host can see booking in /bookings/host
```

## Most Important Rule

A booking should not only contain form data. It must connect all three sides:

```js
{
  user: req.user,
  stay: stay._id,
  host: stay.host
}
```

Without these relations, you cannot correctly show:

```txt
who booked
what they booked
which host should receive the request
```
