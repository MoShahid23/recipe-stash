require('dotenv').config();
const mysql = require('mysql2');
const { exec } = require('child_process');
const path = require('path');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: "root",
    password: process.env.DB_PASSWORD_ROOT
});

//create_db.sql must run first, done through child process
const createDB = path.join(__dirname, 'create_db.sql');
const populateDB = path.join(__dirname, 'populate.sql');
let command = `mysql -h ${process.env.DB_HOST} -u root -p${process.env.DB_PASSWORD_ROOT} < "${createDB}"`;

exec(command, (err, stdout, stderr) => {
    if (err) {
        console.error(`Error executing create_db.sql file: ${stderr}`);
        return;
    }
    console.log(`create_db.sql file executed successfully:\n${stdout}`);

    const populateDB = path.join(__dirname, 'populate_db.sql');
    let command = `mysql -h ${process.env.DB_HOST} -u root -p${process.env.DB_PASSWORD_ROOT} < "${populateDB}"`;
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error executing populate_db.sql file: ${stderr}`);
            return;
        }
        console.log(`populate_db.sql file executed successfully:\n${stdout}`);
    });

    //on success, create user and grant privileges
    db.connect(err => {
        if (err) {
            console.error('Connection error:', err);
            return;
        }

        const createUserQuery = `
            CREATE USER IF NOT EXISTS '${process.env.DB_USER}'@'${process.env.DB_HOST}' IDENTIFIED BY ?
        `;
        db.query(createUserQuery, [process.env.DB_PASSWORD], (err, result) => {
            if (err) {
                console.error('Error creating user:', err);
                return;
            }
            console.log('User created:', result);

            const grantPrivilegesQuery = `
                GRANT ALL PRIVILEGES ON ${process.env.DB_NAME}.* TO '${process.env.DB_USER}'@'localhost'
            `;

            db.query(grantPrivilegesQuery, (err, result) => {
                if (err) {
                    console.error('Error granting privileges:', err);
                } else {
                    console.log('Privileges granted:', result);
                }
                db.end();
            });
        });
    });
});
