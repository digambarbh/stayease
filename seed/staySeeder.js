
const mongoose = require("mongoose")
const Stay = require("../model/stay")
require('dotenv').config()
mongoose.connect(process.env.DATABASE_URL)
const HOST_ID = new mongoose.Types.ObjectId('6a2cf5ed7bfabd297190417e');

const stays = [
  {
    name: "Sea Breeze Villa",
    description: "Luxury villa with a private pool and stunning sea views.",
    price: 8500,
    capacity: 6,
    geometry: {
      lat: 15.2993,
      lng: 74.1240
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6",
        filename: "villa1.jpg"
      }
    ],
    type: "villa",
    isAvailable: true
  },
  {
    name: "Mountain View Cabin",
    description: "Cozy wooden cabin surrounded by mountains and forests.",
    price: 4200,
    capacity: 4,
    geometry: {
      lat: 32.2432,
      lng: 77.1892
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1448375240586-882707db888b",
        filename: "cabin1.jpg"
      }
    ],
    type: "cabin",
    isAvailable: true
  },
  {
    name: "City Center Apartment",
    description: "Modern apartment located in the heart of the city.",
    price: 3000,
    capacity: 3,
    geometry: {
      lat: 18.5204,
      lng: 73.8567
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
        filename: "apartment1.jpg"
      }
    ],
    type: "apartment",
    isAvailable: true
  },
  {
    name: "Lakeside Cottage",
    description: "Peaceful cottage overlooking a beautiful lake.",
    price: 5000,
    capacity: 5,
    geometry: {
      lat: 19.0760,
      lng: 72.8777
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
        filename: "cottage1.jpg"
      }
    ],
    type: "cottage",
    isAvailable: false
  },
  {
    name: "Royal Palace Hotel",
    description: "5-star hotel offering premium rooms and world-class service.",
    price: 12000,
    capacity: 2,
    geometry: {
      lat: 28.6139,
      lng: 77.2090
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
        filename: "hotel1.jpg"
      }
    ],
    type: "hotel",
    isAvailable: true
  },
  {
    name: "Hilltop Villa Retreat",
    description: "Elegant villa with panoramic hill views and spacious gardens.",
    price: 9500,
    capacity: 8,
    geometry: {
      lat: 17.3850,
      lng: 78.4867
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
        filename: "villa2.jpg"
      }
    ],
    type: "villa",
    isAvailable: true
  }
];
async function seedStays() {
  try {
    await Stay.deleteMany({})
    console.log('Cleared existing stays')

    const inserted = await Stay.insertMany(stays)
    console.log(`Seeded ${inserted.length} stays successfully`)
    await Stay.updateMany(
  {},
  {
    $set: {
      host: new mongoose.Types.ObjectId("6a2cf5ed7bfabd297190417e")
    }
  }
);

    await mongoose.disconnect()
    console.log('Disconnected')
  } catch (err) {
    console.error('Seeding failed:', err)
    process.exit(1)
  }
}


seedStays()
