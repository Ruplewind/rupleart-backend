const mongoose = require('mongoose');
const UsersModel = require('../models/UsersModel');
const ProductsModel = require('../models/ProductsModel');

// Always read the flag from the database, never from the JWT. Mobile tokens last
// a year, so a permission baked into the token could never be revoked.
async function loadUser(req) {
    return UsersModel.findById(req.userId).select('accountType canPostAds');
}

// Effective permission: admins always, otherwise the flag
const canPostAds = (user) =>
    Boolean(user) && (user.accountType === 'admin' || user.canPostAds === true);

const requireAdmin = async (req, res, next) => {
    try {
        const user = await loadUser(req);
        if (!user || user.accountType !== 'admin') return res.status(403).json('Forbidden');
        req.currentUser = user;
        next();
    } catch (err) {
        res.status(500).json('Server error');
    }
};

const requireAdPoster = async (req, res, next) => {
    try {
        const user = await loadUser(req);
        if (!canPostAds(user)) {
            return res.status(403).json('Your account is not authorised to post ads');
        }
        req.currentUser = user;
        next();
    } catch (err) {
        res.status(500).json('Server error');
    }
};

// Must run after verifyToken and requireAdPoster (which sets req.currentUser).
// Owners can modify their own products. Admins can modify anyone's.
const requireProductAccess = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json('Invalid product id');
        }

        const product = await ProductsModel.findById(req.params.id).select('ownedBy');
        if (!product) return res.status(404).json('Product not found');

        const isAdmin = req.currentUser && req.currentUser.accountType === 'admin';
        const isOwner = String(product.ownedBy) === String(req.userId);

        if (!isAdmin && !isOwner) {
            return res.status(403).json('You can only modify your own ads');
        }

        next();
    } catch (err) {
        console.error(err);
        res.status(500).json('Server error');
    }
};

module.exports = { requireAdmin, requireAdPoster, requireProductAccess, canPostAds };