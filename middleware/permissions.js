const mongoose = require('mongoose');
const ProductsModel = require('../models/ProductsModel');

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