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
const { validateStay } = require("../middleware/validate");
const upload = multer({ storage })
router.get("/", catchAsync(async (req, res) => {
    const stays = await Stay.find({})
    res.render("stay/stays", { stays })
}))

router.get('/new', checkAuth, isHost, (req, res) => {
    res.render('stay/new')
})

router.get('/:id', catchAsync(async (req, res) => {
    const stay = await Stay.findById(req.params.id).populate("host")
    res.render("stay/show", { stay })
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
