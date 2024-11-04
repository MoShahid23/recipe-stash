CREATE DATABASE IF NOT EXISTS rs_db;
USE rs_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    published TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    author_id INT NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);


DELIMITER $$

CREATE PROCEDURE getRecipes(IN tags VARCHAR(255))
BEGIN
    SET @sql_query = 'SELECT r.title, r.published, r.description, r.ingredients, u.username
                      FROM recipes AS r
                      JOIN users AS u ON r.author_id = u.id';

    -- Check if tags are provided
    IF tags IS NOT NULL AND tags != '' THEN
        SET @sql_query = CONCAT(@sql_query, ' WHERE r.tags IN (', tags, ')');
    END IF;

    SET @sql_query = CONCAT(@sql_query, ' ORDER BY r.published DESC');

    -- Prepare and execute the dynamic SQL
    PREPARE stmt FROM @sql_query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;
