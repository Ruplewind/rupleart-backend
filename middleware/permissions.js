const UsersModel = require('../models/UsersModel');

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

module.exports = { requireAdmin, requireAdPoster, canPostAds };