const express = require('express')
require("dotenv").config()
const router = express.Router()
const Stay = require("../model/stay")
const catchAsync = require("../utility/catchAsync")
const checkAuth = require('../middleware/auth')
const isHost = require("../middleware/isHost")
const multer = require("multer")
const { cloudinary, storage } = require("../cloudinary")
const User = require('../model/user')
const Booking = require('../model/booking')
const { validateStay } = require("../middleware/validate");
const upload = multer({ storage })
router.get("/", catchAsync(async (req, res) => {
    const { type, minPrice, maxPrice, bedrooms, sort, page = 1 } = req.query;
    
    // Build filter query
    const filter = {};
    if (type) filter.type = type;
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (bedrooms) filter.capacity = { $gte: Number(bedrooms) };
    
    // Build sort option
    let sortOption = {};
    if (sort === 'price_asc') sortOption.price = 1;
    else if (sort === 'price_desc') sortOption.price = -1;
    else if (sort === 'newest') sortOption.createdAt = -1;
    
    // Pagination
    const limit = 12;
    const skip = (Number(page) - 1) * limit;
    
    const staysPromise = Stay.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean();
        
    const countPromise = Stay.countDocuments(filter);
    
    const [stays, totalStays] = await Promise.all([staysPromise, countPromise]);
    const totalPages = Math.ceil(totalStays / limit);
    
    res.render("stay/stays", { 
        stays, 
        currentPage: Number(page), 
        totalPages,
        query: req.query 
    });
}))

router.get('/new', checkAuth, isHost, (req, res) => {
    res.render('stay/new')
})

router.get('/:id', catchAsync(async (req, res) => {
    const stay = await Stay.findById(req.params.id)
        .populate("host")
        .populate({
            path: 'reviews',
            populate: {
                path: 'author'
            }
        });

    let hasBooked = false;
    // We check req.cookies.token directly since this route doesn't have checkAuth middleware
    if (req.cookies.token) {
        try {
            const jwt = require("jsonwebtoken");
            const payload = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
            const booking = await Booking.findOne({
                user: payload.id,
                stay: req.params.id,
                status: { $in: ['approved'] }
            });
            if (booking) hasBooked = true;
        } catch (e) {
            // Token might be invalid or expired, ignore
        }
    }

    res.render("stay/show", { stay, hasBooked })
}))


router.post('/new', checkAuth, isHost, upload.array('image'), validateStay, catchAsync(async (req, res) => {

    const stay = new Stay(req.body.stay);

    stay.images = req.files.map(f => ({
        url: f.path,
        filename: f.filename
    }));

    stay.host = req.user;

    // Geocode location
    const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(
            stay.location
        )}.json?country=in&limit=1&key=${process.env.MAPTILER_KEY}`
    );

    const data = await response.json();

    if (data.features?.length) {

        const feature = data.features[0];

        stay.geometry = {
            lat: feature.center[1],
            lng: feature.center[0]
        };

        stay.location = feature.place_name;
    }

    await stay.save();

    await User.findByIdAndUpdate(
        req.user,
        {
            $push: {
                stay: stay._id
            }
        }
    );
    res.cookie("flash",{type:"success",message:"Stay Created.Start Hosting"})
    res.redirect(`/stays/${stay._id}`);
})
);

router.get("/:id/update", checkAuth, isHost, catchAsync(async (req, res) => {
    const stay = await Stay.findById(req.params.id)
    // Error: host role was checked, but stay owner was not checked.
    if (!stay.host.equals(req.user)) {
        return res.send("you are not owner of this stay")
    }
    res.render("stay/update", { stay })
}))
router.patch("/:id", checkAuth, isHost, upload.array('image'), validateStay, catchAsync(async (req, res) => {
    const { id } = req.params;
    const stay = await Stay.findById(id)
    // Error: any host could update another host's stay.
    if (!stay.host.equals(req.user)) {
        return res.send("you are not owner of this stay")
    }

    // Update primitive fields
    if (req.body.stay) {
        for (const key of Object.keys(req.body.stay)) {
            stay[key] = req.body.stay[key]
        }
    }

    // Add newly uploaded images (if any)
    if (req.files && req.files.length > 0) {
        const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }))
        stay.images.push(...imgs)
    }

    // Handle deletion of selected images
    if (req.body.deleteImages) {
        // deleteImages may be a single string or an array
        const toDelete = Array.isArray(req.body.deleteImages) ? req.body.deleteImages : [req.body.deleteImages]
        for (const filename of toDelete) {
            // remove from cloudinary
            await cloudinary.uploader.destroy(filename)
            // remove from stay.images
            stay.images = stay.images.filter(img => img.filename !== filename)
        }
    }
    const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(
            stay.location
        )}.json?country=in&limit=1&key=${process.env.MAPTILER_KEY}`
    );

    const data = await response.json();

    if (data.features?.length) {

        const feature = data.features[0];

        stay.geometry = {
            lat: feature.center[1],
            lng: feature.center[0]
        };

        stay.location = feature.place_name;
    }

    await stay.save()
    res.cookie("flash",{type:"success",message:"Stay Updated"})
    res.redirect(`/stays/${id}`)
}))

router.delete("/:id", checkAuth, isHost, catchAsync(async (req, res) => {
    const { id } = req.params
    const stay = await Stay.findById(id)
    // Error: any host could delete another host's stay.
    if (!stay.host.equals(req.user)) {
        return res.send("you are not owner of this stay")
    }
    await Stay.findByIdAndDelete(id)
    res.cookie("flash",{type:"danger",message:"Stay Deleted Successfully"})
    res.redirect("/stays")
}))


module.exports = router
