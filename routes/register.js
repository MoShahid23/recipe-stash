//create a new router
const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const saltRounds = 10


router.get('/',function(req, res){
    var registerForm = req.session.registerForm || {};
    req.session.registerForm = null;
    console.log(req.query.formerror)

    switch(req.query.formerror){
        case "both":
            res.render("register.ejs", {formerror:"The username and email entered are in use already.", username:registerForm.username, email:registerForm.email});
            break;
        case "username":
            res.render("register.ejs", {formerror:"This username has already been taken.", username:registerForm.username, email:registerForm.email});
            break;
        case "email":
            res.render("register.ejs", {formerror:"This email has already been registered.", username:registerForm.username, email:registerForm.email});
            break
        default:
            res.render("register.ejs");
    }
})

router.post('/submit',function(req, res){
    var email = req.body.email;
    var username = req.body.username;

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
                let query = `INSERT INTO users(username, email, password) VALUES("${username}", "${email}", "${hashedPassword}");`;
                db.query(query, (err, result) => {
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
})

module.exports = router