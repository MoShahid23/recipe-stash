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

CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_tags (
    recipe_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_recipes (
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    PRIMARY KEY (user_id, recipe_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

DELIMITER $$

CREATE PROCEDURE getRecipes(IN tags VARCHAR(255))
BEGIN
    SET @sql_query = 'SELECT r.id, r.title, r.published, r.description, r.ingredients, u.username
                      FROM recipes AS r
                      JOIN users AS u ON r.author_id = u.id';

    IF tags IS NOT NULL AND tags != '' THEN
        SET @sql_query = CONCAT(@sql_query, ' WHERE r.tags IN (', tags, ')');
    END IF;

    SET @sql_query = CONCAT(@sql_query, ' ORDER BY r.published DESC');

    PREPARE stmt FROM @sql_query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

CREATE PROCEDURE getRecipe(
    IN recipeId INT
)
BEGIN
    SELECT
        r.title,
        r.description,
        r.ingredients,
        r.instructions,
        r.published,
        GROUP_CONCAT(t.name) AS tags
    FROM recipes r
    JOIN users u ON r.author_id = u.id
    LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
    LEFT JOIN tags t ON rt.tag_id = t.id
    WHERE r.id = recipeId
    GROUP BY r.id;
END$$

DELIMITER ;
