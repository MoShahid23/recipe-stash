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
        return res.redirect("/");
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

router.post('/submit',[
// Validation rules
body('username').isLength(2).withMessage('Username must be at least 2 characters long').isAlphanumeric().withMessage('Username must be alphanumeric'),
body('email').isEmail().withMessage('Please provide a valid email'),
body('password').isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 2,
    minSymbols: 1,
}).withMessage('Password must be at least 10 characters long and include a mix of upper and lowercase, 2 numbers, and 1 symbol')
],(req, res) => {
    const errors = validationResult(req);
    const username = req.body.username
    const email = req.body.email

    console.log("", username, email);

    // If there are validation errors
    if (!errors.isEmpty()) {
        // Store error messages and form data in session
        req.session.registerForm = {
            username,
            email,
            errors: errors.array().map(err => err.msg) // Array of error messages
        };

        // Redirect with formerror query
        return res.redirect('/register?formerror=validation');
    }

    let checkQuery = `
        SELECT
            (username = ?) AS username_match,
            (email = ?) AS email_match
        FROM users
        WHERE username = ? OR email = ?;
    `;

    db.query(checkQuery, [username, email, username, email], (err, results) => {
        if (err) {
            return console.error(err);
        }

        //data is valid
        if (results.length === 0) {

            bcrypt.hash(req.body.password, saltRounds, function(err, hashedPassword) {
                if (err) {
                    console.error(err);
                    return res.send('There was an error processing your request.');
                }
                let query = `INSERT INTO users(username, email, password) VALUES(?, ?, ?);`;
                db.query(query, [username, email, hashedPassword], (err, result) => {
                    if (err) {
                        console.error(err)
                        res.send('There was an error processing your request.')
                    }
                    req.session.userId = req.body.username;
                    res.redirect('/?notif=registered')
                })
            })

        //invalid data
        } else {
            req.session.registerForm = { username, email };

            var usernameMatch = results.some(row => row.username_match);
            var emailMatch = results.some(row => row.email_match);

            console.log(usernameMatch && emailMatch)

            if (usernameMatch && emailMatch) {
                return res.redirect('/register?formerror=both');
            } else if (usernameMatch) {
                return res.redirect('/register?formerror=username');
            } else if (emailMatch) {
                return res.redirect('/register?formerror=email');
            }
        }
    });
});

router.post('/taken', (req, res) => {
    const username = req.body.username;
    console.log(username);

    let checkQuery = `
        SELECT username
        FROM users
        WHERE username = ?
    `;

    db.query(checkQuery, [username], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: 'Database query error' }); // Handle error properly
        }

        if (results.length > 0) {
            res.send({ taken: true });
        } else {
            res.send({ taken: false });
        }
    });
});

module.exports = router