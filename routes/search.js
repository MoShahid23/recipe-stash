//create a new router
const express = require("express");
const { query, validationResult } = require("express-validator");
const router = express.Router();
const { getPosts } = require("./api.js");

router.get(
  '/',
  [
    //validate and sanitize inputs
    query('q').optional().isString().trim(),
    query('username').optional().isString().trim(),
    query('tags').optional().isString().trim(),
    query('from').customSanitizer(value => (value === "" ? undefined : value)).optional().isISO8601().toDate(),
    query('to').customSanitizer(value => (value === "" ? undefined : value)).optional().isISO8601().toDate(),
    query('page').customSanitizer(value => (isNaN(value) || value < 1) ? 1 : value).toInt(),
    query('strict').customSanitizer(value => (value !== "true" ? false : value)).optional().isBoolean().toBoolean()
  ],
  async (req, res) => {
    let renderData = {};
    renderData.loggedIn = req.session.userId ? true : false;
    renderData.username = req.session.userId;

    let queryParam = req.query.q;
    let username = req.query.username;
    let tags = req.query.tags;
    let from = req.query.from;
    let to = req.query.to;
    let page = parseInt(req.query.page);
    let strict = req.query.strict;

    renderData.foundPosts = [];
    renderData.search = req.query;

    //handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        renderData.error = errors.errors.map(error => error.msg+" for field '"+error.path+"'").join("<br>");
        console.log(errors)
        return res.status(400).render('search', renderData);
    }

    if (tags) {
        tags = tags.split(",").map(tag => tag.trim().toLowerCase());
    }

    try {
      let result = await getPosts({
        title: queryParam,
        username,
        tags,
        from,
        to,
        number: 10,
        offset: (page - 1) * 10,
        strict
      });
      renderData.foundPosts = result;
      res.render("search", renderData);
    } catch (error) {
      console.error(error);
      renderData.error = error;
      res.status(500).render("search", renderData);
    }
  }
);

module.exports = router;