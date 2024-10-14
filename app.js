let express = require('express');

let app = express();

require('dotenv').config();

app.use(express.json())

let cors = require('cors');

app.use(cors());

let mongoose = require('mongoose');

let mongoURI = process.env.Mongo_URI;

mongoose.connect(mongoURI);

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json({ limit: '50mb' }));

let UsersController = require('./controllers/UsersController');
app.use('/', UsersController);

let ProductsController = require('./controllers/ProductsController');
app.use('/', ProductsController);

let OrdersController = require('./controllers/OrdersController');
app.use('/', OrdersController);

let LocationsController = require('./controllers/LocationsController');
app.use('/', LocationsController);

let CategoriesController = require('./controllers/CategoriesController');
app.use('/', CategoriesController);

let EventsController = require('./controllers/EventsController');
app.use('/', EventsController);

let MessagesController = require('./controllers/MessagesController');
app.use('/', MessagesController);

app.get('/',(req, res)=>{
    res.json('Ruple art');
})

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    res.header('mode', 'cors')
    next();
});

let port = process.env.PORT || 5000;

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`)
});