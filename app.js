require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

const allowedOrigins = [
  'https://rupleart.com',
  'https://www.rupleart.com',
  'https://admin.rupleart.com',
  "https://goodwin.site",
  'http://localhost:3000',
  'http://localhost:4000',
  'http://102.212.244.79'
];

app.use(cors({
  origin: (origin, cb) => {
    console.log('Request origin:', origin);
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS blocked'));
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