//create a new router
const express = require("express")
const router = express.Router()
const {body, validationResult } = require('express-validator');
const bcrypt = require("bcrypt");
const saltRounds = 10

router.get('/', function(req, res){
    let renderData = {};
    renderData.loggedIn = req.session.userId ? true : false;

    //redirect to main page if already authenticated
    if(renderData.loggedIn){
        return res.redirect(global.baseUrl+"/");
    }

    var registerForm = req.session.registerForm || {};
    req.session.registerForm = null;

    renderData.username = registerForm.username;
    renderData.email = registerForm.email;

    switch(req.query.formerror){
        case "both":
            renderData.formerror = ["The username and email entered are in use already."];
            res.render("register.ejs", renderData);
            break;
        case "username":
            renderData.formerror = ["This username has already been taken."];
            res.render("register.ejs", renderData);
            break;
        case "email":
            renderData.formerror = ["This email has already been registered."];
            res.render("register.ejs", renderData);
            break
        case "validation":
            renderData.formerror = registerForm.errors;
            res.render("register.ejs", renderData);
            break
        default:
            res.render("register.ejs");
            break;
    }
})

router.post(
    "/submit",
    [
        //validation rules
        body("username")
            .isLength(2)
            .withMessage("Username must be at least 2 characters long")
            .isAlphanumeric()
            .withMessage("Username must be alphanumeric")
            .isLength({ max: 100 }).withMessage("Username must be less than 100 characters"),
        body("email").isEmail().withMessage("Please provide a valid email"),
        body("password")
            .isStrongPassword({
                minLength: 8,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 2,
                minSymbols: 1,
            })
            .withMessage(
                "Password must be at least 8 characters long and include a mix of upper and lowercase, 2 numbers, and 1 symbol"
            ).isLength({ max: 100 }).withMessage("Username must be less than 100 characters"),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const { username, email, password } = req.body;

        console.log("", username, email);

        //if there are validation errors
        if (!errors.isEmpty()) {
            //store error messages and form data in session
            req.session.registerForm = {
                username,
                email,
                errors: errors.array().map((err) => err.msg), //array of error messages
            };

            //redirect with formerror query
            return res.redirect(global.baseUrl+"/register?formerror=validation");
        }

        try {
            const checkQuery = `
                SELECT
                    (username = ?) AS username_match,
                    (email = ?) AS email_match
                FROM users
                WHERE username = ? OR email = ?;
            `;

            const [results] = await db.query(checkQuery, [username, email, username, email]);

            //data is valid
            if (results.length === 0) {
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                const query = `INSERT INTO users(username, email, password) VALUES(?, ?, ?);`;
                await db.query(query, [username, email, hashedPassword]);

                req.session.userId = username;
                return res.redirect(global.baseUrl+"/?notif=registered");
            }

            //invalid data
            req.session.registerForm = { username, email };

            const usernameMatch = results.some((row) => row.username_match);
            const emailMatch = results.some((row) => row.email_match);

            console.log(usernameMatch && emailMatch);

            if (usernameMatch && emailMatch) {
                return res.redirect(global.baseUrl+"/register?formerror=both");
            } else if (usernameMatch) {
                return res.redirect(global.baseUrl+"/register?formerror=username");
            } else if (emailMatch) {
                return res.redirect(global.baseUrl+"/register?formerror=email");
            }
        } catch (err) {
            console.error(err);
            res.send("There was an error processing your request.");
        }
    }
);

//route for checking if username is taken
router.post("/taken", async (req, res) => {
    const { username } = req.body;
    console.log(username);

    try {
        const checkQuery = `
            SELECT username
            FROM users
            WHERE username = ?;
        `;

        const [results] = await db.query(checkQuery, [username]);

        if (results.length > 0) {
            res.send({ taken: true });
        } else {
            res.send({ taken: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Database query error" }); //handle error properly
    }
});

module.exports = router