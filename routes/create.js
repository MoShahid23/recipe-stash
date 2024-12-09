//create a new router
const express = require("express")
const router = express.Router()
const {isAuthenticated} = require('../middlewares');

router.get('/', isAuthenticated, function(req, res) {
    let renderData = {};
    renderData.loggedIn = req.session.userId ? true : false;
    renderData.username = req.session.userId;
    res.render('create', renderData)
});

module.exports = router