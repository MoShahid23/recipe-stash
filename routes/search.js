//create a new router
const express = require("express")
const router = express.Router()
const { getPosts } = require("./api.js")

router.get('/', async (req, res) => {
    let renderData = {};
    renderData.loggedIn = req.session.userId ? true : false;
    renderData.username = req.session.userId;

    let query = req.query.q;
    let username = req.query.username;
    let tags = req.query.tags;
    let from = req.query.from
    let to = req.query.to;
    let page = (Number(req.query.page)||1)>0?(Number(req.query.page)||1):1;
    req.query.page = page;

    renderData.search = req.query;

    if(tags){
        tags = tags.split(",")
    }

    let result = await getPosts({ title:query, username, tags, from, to, number: 10, offset:(page-1)*10 });
    renderData.foundPosts = result;

    res.render("search", renderData);
});

module.exports = router