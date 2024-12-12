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

CREATE TABLE IF NOT EXISTS ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity VARCHAR(50),
    PRIMARY KEY (recipe_id, ingredient_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_recipes (
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    PRIMARY KEY (user_id, recipe_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

DELIMITER $$

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

DELIMITER $$
CREATE PROCEDURE addRecipe (
    IN recipeTitle VARCHAR(100),
    IN recipeDescription TEXT,
    IN recipeInstructions TEXT,
    IN authorId INT,
    IN ingredientList JSON -- Pass a JSON array of {quantity, name}
)
BEGIN
    DECLARE recipeId INT;

    -- Step 1: Insert the recipe and get the inserted recipe_id
    INSERT INTO recipes (title, description, instructions, author_id)
    VALUES (recipeTitle, recipeDescription, recipeInstructions, authorId);

    SET recipeId = LAST_INSERT_ID();

    -- Step 2: Process each ingredient in the JSON array
    DECLARE i INT DEFAULT 0;
    DECLARE ingredientCount INT;
    SET ingredientCount = JSON_LENGTH(ingredientList);

    WHILE i < ingredientCount DO
        -- Extract ingredient details
        DECLARE ingredientName VARCHAR(100);
        DECLARE ingredientQuantity VARCHAR(50);

        SET ingredientName = JSON_UNQUOTE(JSON_EXTRACT(ingredientList, CONCAT('$[', i, '].name')));
        SET ingredientQuantity = JSON_UNQUOTE(JSON_EXTRACT(ingredientList, CONCAT('$[', i, '].quantity')));

        -- Ensure the ingredient exists in the ingredients table
        DECLARE ingredientId INT;
        SELECT id INTO ingredientId FROM ingredients WHERE name = ingredientName;

        IF ingredientId IS NULL THEN
            INSERT INTO ingredients (name) VALUES (ingredientName);
            SET ingredientId = LAST_INSERT_ID();
        END IF;

        -- Insert into recipe_ingredients table
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
        VALUES (recipeId, ingredientId, ingredientQuantity);

        SET i = i + 1;
    END WHILE;
END$$
DELIMITER ;

DELIMITER //

CREATE PROCEDURE addRecipe(
    IN recipeTitle VARCHAR(100),
    IN recipeDescription TEXT,
    IN recipeInstructions TEXT,
    IN authorId INT,
    IN ingredientsJson TEXT
)
BEGIN
    DECLARE recipeId INT;
    DECLARE ingredientName VARCHAR(100);
    DECLARE ingredientQuantity VARCHAR(50);
    DECLARE ingredientId INT;

    -- Insert the recipe into the recipes table
    INSERT INTO recipes (title, description, instructions, author_id)
    VALUES (recipeTitle, recipeDescription, recipeInstructions, authorId);

    -- Get the last inserted recipe ID
    SET recipeId = LAST_INSERT_ID();

    -- Iterate over the JSON array of ingredients
    WHILE JSON_LENGTH(ingredientsJson) > 0 DO
        -- Extract the first ingredient object
        SET ingredientName = JSON_UNQUOTE(JSON_EXTRACT(ingredientsJson, '$[0].name'));
        SET ingredientQuantity = JSON_UNQUOTE(JSON_EXTRACT(ingredientsJson, '$[0].quantity'));

        -- Check if the ingredient already exists
        SELECT id INTO ingredientId FROM ingredients WHERE name = ingredientName LIMIT 1;

        -- If not found, insert the new ingredient
        IF ingredientId IS NULL THEN
            INSERT INTO ingredients (name) VALUES (ingredientName);
            SET ingredientId = LAST_INSERT_ID();
        END IF;

        -- Insert into the recipe_ingredients table
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
        VALUES (recipeId, ingredientId, ingredientQuantity);

        -- Remove the processed ingredient from the JSON array
        SET ingredientsJson = JSON_REMOVE(ingredientsJson, '$[0]');
    END WHILE;
END //

DELIMITER ;
