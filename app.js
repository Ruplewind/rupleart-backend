require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const sharp = require("sharp");
const fs = require("fs");

const app = express();

const allowedOrigins = [
  'https://rupleart.com',
  'https://www.rupleart.com',
  'https://admin.rupleart.com',
  "https://goodwin.site",
  'http://localhost:3000',
  'http://localhost:4000',
  'http://102.212.244.79',
  'https://pay.pesapal.com'
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS blocked from: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
}));

app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));

mongoose.connect(process.env.Mongo_URI);

// static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get("/thumb/:file", async (req, res) => {
  try {
    const file = path.basename(req.params.file); // blocks path traversal
    const src = path.join(__dirname, "uploads", file);
    const cacheDir = path.join(__dirname, "uploads", ".thumbs");
    const dest = path.join(cacheDir, `${file}.webp`);

    fs.mkdirSync(cacheDir, { recursive: true });
    if (!fs.existsSync(dest)) {
      await sharp(src).resize({ width: 400 }).webp({ quality: 70 }).toFile(dest);
    }
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile(dest);
  } catch {
    res.status(404).end();
  }
});

// routes
app.use('/', require('./controllers/UsersController'));
app.use('/', require('./controllers/ProductsController'));
app.use('/', require('./controllers/OrdersController'));
app.use('/', require('./controllers/LocationsController'));
app.use('/', require('./controllers/CategoriesController'));
app.use('/', require('./controllers/EventsController'));
app.use('/', require('./controllers/MessagesController'));
app.use('/', require('./controllers/PhishingController'));

app.get('/', (req, res) => {
  res.json('Ruple art');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});