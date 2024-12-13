USE rs_db;

INSERT INTO users (username, email, password)
VALUES
    ('RecipeStash', 'admin@recipestash.com', 'RSyrmywyferoy2'),
    ('alice', 'alice@example.com', 'hashed_password1'),
    ('bob', 'bob@example.com', 'hashed_password2'),
    ('charlie', 'charlie@example.com', 'hashed_password3');

-- Insert sample data into `recipes`
-- Insert ingredients
INSERT INTO ingredients (name) VALUES
    ('spaghetti'),
    ('ground beef'),
    ('tomato sauce'),
    ('garlic'),
    ('onion'),
    ('olive oil'),
    ('chicken'),
    ('curry powder'),
    ('coconut milk'),
    ('grated ginger'),
    ('broccoli'),
    ('red bell pepper'),
    ('soy sauce'),
    ('sesame oil'),
    ('flour'),
    ('eggs'),
    ('milk'),
    ('sugar'),
    ('butter');

-- Insert recipes
INSERT INTO recipes (title, description, instructions, author_id)
VALUES
    ('Spaghetti Bolognese', 
     'A classic Italian pasta dish with a rich, savory sauce.',
     '1. Cook spaghetti. 2. Prepare sauce with beef, garlic, and tomato. 3. Combine and serve.',
     1),

    ('Chicken Curry', 
     'A flavorful and spicy chicken curry dish.',
     '1. Cook chicken until browned. 2. Add spices and coconut milk. 3. Simmer and serve.', 
     2),

    ('Vegetable Stir Fry', 
     'A quick and easy vegetable stir-fry with Asian flavors.',
     '1. Stir-fry vegetables in sesame oil. 2. Add soy sauce and garlic. 3. Serve hot.', 
     3),

    ('Pancakes', 
     'Fluffy pancakes perfect for breakfast.',
     '1. Mix ingredients. 2. Pour batter onto a hot pan. 3. Flip when bubbly. Serve with syrup.', 
     1);

-- Insert recipe_ingredients associations (Note: ingredient_id should match the inserted IDs of the ingredients above)
-- For Spaghetti Bolognese (recipe_id = 1)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
VALUES
    (1, (SELECT id FROM ingredients WHERE name = 'spaghetti'), '200 g'),
    (1, (SELECT id FROM ingredients WHERE name = 'ground beef'), '500 g'),
    (1, (SELECT id FROM ingredients WHERE name = 'tomato sauce'), '400 g'),
    (1, (SELECT id FROM ingredients WHERE name = 'garlic'), '2 cloves'),
    (1, (SELECT id FROM ingredients WHERE name = 'onion'), '1'),
    (1, (SELECT id FROM ingredients WHERE name = 'olive oil'), '2 tbsp');

-- For Chicken Curry (recipe_id = 2)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
VALUES
    (2, (SELECT id FROM ingredients WHERE name = 'chicken'), '500 g'),
    (2, (SELECT id FROM ingredients WHERE name = 'curry powder'), '2 tbsp'),
    (2, (SELECT id FROM ingredients WHERE name = 'coconut milk'), '400 ml'),
    (2, (SELECT id FROM ingredients WHERE name = 'garlic'), '2 cloves'),
    (2, (SELECT id FROM ingredients WHERE name = 'onion'), '1'),
    (2, (SELECT id FROM ingredients WHERE name = 'grated ginger'), '1 tbsp');

-- For Vegetable Stir Fry (recipe_id = 3)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
VALUES
    (3, (SELECT id FROM ingredients WHERE name = 'broccoli'), '150 g'),
    (3, (SELECT id FROM ingredients WHERE name = 'red bell pepper'), '1'),
    (3, (SELECT id FROM ingredients WHERE name = 'soy sauce'), '3 tbsp'),
    (3, (SELECT id FROM ingredients WHERE name = 'garlic'), '2 cloves'),
    (3, (SELECT id FROM ingredients WHERE name = 'grated ginger'), '1 tbsp'),
    (3, (SELECT id FROM ingredients WHERE name = 'sesame oil'), '1 tbsp');

-- For Pancakes (recipe_id = 4)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
VALUES
    (4, (SELECT id FROM ingredients WHERE name = 'flour'), '200 g'),
    (4, (SELECT id FROM ingredients WHERE name = 'eggs'), '2'),
    (4, (SELECT id FROM ingredients WHERE name = 'milk'), '300 ml'),
    (4, (SELECT id FROM ingredients WHERE name = 'sugar'), '50 g'),
    (4, (SELECT id FROM ingredients WHERE name = 'butter'), '50 g');

