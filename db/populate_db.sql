USE rs_db;

INSERT INTO users (username, email, password)
VALUES
    ('RecipeStash', )

INSERT INTO users (username, email, password)
VALUES
    ('RecipeStash', 'admin@recipestash.com', 'RSyrmywyferoy2'),
    ('alice', 'alice@example.com', 'hashed_password1'),
    ('bob', 'bob@example.com', 'hashed_password2'),
    ('charlie', 'charlie@example.com', 'hashed_password3');

-- Insert sample data into `recipes`
INSERT INTO recipes (title, description, ingredients, instructions, author_id)
VALUES
    ('Spaghetti Bolognese',
     'A classic Italian pasta dish with a rich, savory sauce.',
     '200 g#q#spaghetti#p#500 g#q#ground beef#p#400 g#q#tomato sauce#p#2 cloves#q#garlic#p#1#q#onion#p#2 tbsp#q#olive oil',
     '1. Cook spaghetti. 2. Prepare sauce with beef, garlic, and tomato. 3. Combine and serve.', 
     1),

    ('Chicken Curry',
     'A flavorful and spicy chicken curry dish.',
     '500 g#q#chicken#p#2 tbsp#q#curry powder#p#400 ml#q#coconut milk#p#2 cloves#q#garlic#p#1#q#onion#p#1 tbsp#q#grated ginger',
     '1. Cook chicken until browned. 2. Add spices and coconut milk. 3. Simmer and serve.', 
     2),

    ('Vegetable Stir Fry',
     'A quick and easy vegetable stir-fry with Asian flavors.',
     '150 g#q#broccoli#p#1#q#red bell pepper#p#3 tbsp#q#soy sauce#p#2 cloves#q#garlic#p#1 tbsp#q#grated ginger#p#1 tbsp#q#sesame oil',
     '1. Stir-fry vegetables in sesame oil. 2. Add soy sauce and garlic. 3. Serve hot.', 
     3),

    ('Pancakes',
     'Fluffy pancakes perfect for breakfast.',
     '200 g#q#flour#p#2#q#eggs#p#300 ml#q#milk#p#50 g#q#sugar#p#50 g#q#butter',
     '1. Mix ingredients. 2. Pour batter onto a hot pan. 3. Flip when bubbly. Serve with syrup.', 
     1);
