module.exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect(global.baseUrl+'/login');
    }
};
