//create a new router
const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const saltRounds = 10;

// Route for displaying login page
router.get("/", async (req, res) => {
    let renderData = {};
    renderData.loggedIn = req.session.userId ? true : false;

    if (renderData.loggedIn) {
        return res.redirect("/");
    }

    const loginForm = req.session.loginForm || {};
    req.session.loginForm = null;

    renderData.email = loginForm.email;

    switch (req.query.formerror) {
        case "invalid":
            renderData.formerror = ["Invalid username or password."];
            res.render("login.ejs", renderData);
            break;
        case "error":
            renderData.formerror = [
                "There was an error processing your request, please try again later.",
            ];
            res.render("login.ejs", renderData);
            break;
        default:
            res.render("login.ejs");
            break;
    }
});

// Route for handling login submission
router.post(
    "/submit",
    [
        //express-validator middleware
        body("email").isEmail(),
        body("password").isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 2,
            minSymbols: 1,
        }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const { email, password } = req.body;

        // Storing in session for redirect after errors
        req.session.loginForm = {
            email,
        };

        // If validation encounters error, redirect and display them.
        if (!errors.isEmpty()) {
            // Redirect with query to signal error occurred
            return res.redirect("/login?formerror=invalid");
        }

        try {
            const query = `SELECT username, password FROM users WHERE email = ?`;

            // Execute query with await syntax
            const [results] = await db.query(query, [email]);

            if (results.length === 0) {
                // Email does not exist in the database
                return res.redirect("/login?formerror=invalid");
            }

            // Retrieve hashed password
            const hashedPassword = results[0].password;

            // Compare password using bcrypt
            const isMatch = await bcrypt.compare(password, hashedPassword);

            if (!isMatch) {
                // Passwords don't match
                return res.redirect("/login?formerror=invalid");
            }

            // Request validated, log user in
            req.session.userId = results[0].username;
            req.session.loginForm = null; // Clear this data
            res.redirect("/?notif=loggedin");
        } catch (err) {
            console.error(err);
            return res.redirect("/login?formerror=error");
        }
    }
);

module.exports = router;
