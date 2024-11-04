//create a new router
const express = require("express")
const router = express.Router()
const {body, validationResult } = require('express-validator');
const bcrypt = require("bcrypt");
const saltRounds = 10

router.get('/',function(req, res){
    var loginForm = req.session.loginForm || {};
    req.session.loginForm = null;

    switch(req.query.formerror){
        case "invalid":
            res.render("login.ejs", {formerror:["Invalid username or password."], email:loginForm.email});
            break
        case "error":
            res.render("login.ejs", {formerror:["There was an error processing your request, please try again later."], email:loginForm.email});
            break
        default:
            res.render("login.ejs");
            break;
    }
})

router.post('/submit',[
//express-validator middleware
body('email').isEmail(),
body('password').isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 2,
    minSymbols: 1,
})
],(req, res) => {
    const errors = validationResult(req);
    const {email, password} = req.body;

    //storing in session for redirect after errors
    req.session.loginForm = {
        email
    };

    //if validation encounters error, redirect and display them.
    if (!errors.isEmpty()) {
        //redirect with query to signal error ocurred
        return res.redirect('/login?formerror=invalid');
    }

    let query = `SELECT username, password FROM users WHERE email = ?`;

    db.query(query, [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.redirect('/login?formerror=error');
        }

        if (results.length === 0) {
            //email does not exist in db
            return res.redirect('/login?formerror=invalid');
        }

        //retrieve hashed password
        const hashedPassword = results[0].password;

        bcrypt.compare(password, hashedPassword, (err, isMatch) => {
            if (err) {
                console.error(err);
                return res.redirect('/login?formerror=error');
            }

            if (!isMatch) {
                //passwords don't match
                return res.redirect('/login?formerror=invalid');
            }

            //request validated, log user in
            req.session.userId = results[0].username;
            req.session.loginForm = null; //clear this data
            res.redirect('/?notif=loggedin');
        });
    });
});

module.exports = router