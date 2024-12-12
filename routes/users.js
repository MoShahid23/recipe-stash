//create a new router
const express = require("express")
const router = express.Router()
const {isAuthenticated} = require('../middlewares');

router.get('/:username/posts/:id/:title?', function(req, res) {
    let renderData = {};
    const { username, id } = req.params;
    renderData.loggedIn = req.session.userId ? true : false;
    renderData.username = req.session.userId;

    let query = "CALL getRecipe(?);";
    db.query(query, [id], function(err, result){
        if (err) {
            console.error(err);
            renderData.error = "An error has occurred trying to retrieve this post, please try agin later."
            res.render('post', renderData);
        }

        if (result) {
            renderData.post = result[0][0];
            renderData.post.username = username;
            res.render("post", renderData);
        }
        else{
            //post not found
            renderData.error = "Recipe not found..."
            res.render('post', renderData);
        }
    });
});

module.exports = router