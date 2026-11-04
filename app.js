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

let resizer = null;
try {
  const sharp = require("sharp");
  resizer = async (src, dest) =>
    sharp(src).resize({ width: 400 }).jpeg({ quality: 70 }).toFile(dest);
} catch {
  try {
    const { Jimp } = require("jimp");
    resizer = async (src, dest) => {
      const img = await Jimp.read(src);
      img.resize({ w: 400 });
      const buf = await img.getBuffer("image/jpeg", { quality: 70 });
      await fs.promises.writeFile(dest, buf);
    };
  } catch {
    console.warn("No image library available, serving original images");
  }
}

const UPLOADS_DIR = path.join(__dirname, "uploads"); // adjust to your real path
const THUMBS_DIR = path.join(UPLOADS_DIR, ".thumbs");
fs.mkdirSync(THUMBS_DIR, { recursive: true });

const inFlight = new Map(); // avoid generating the same thumbnail twice at once

app.get("/thumb/:file", async (req, res) => {
  const file = path.basename(req.params.file); // blocks path traversal
  const src = path.join(UPLOADS_DIR, file);
  const dest = path.join(THUMBS_DIR, `${file}.jpg`);

  try {
    if (!fs.existsSync(src)) return res.status(404).end();

    if (resizer && !fs.existsSync(dest)) {
      if (!inFlight.has(dest)) {
        inFlight.set(
          dest,
          resizer(src, dest).finally(() => inFlight.delete(dest))
        );
      }
      await inFlight.get(dest);
    }

    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile(resizer ? dest : src);
  } catch (err) {
    console.error("thumb error:", err.message);
    // Fall back to the original so the image still shows
    res.sendFile(src, (e) => e && res.status(404).end());
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