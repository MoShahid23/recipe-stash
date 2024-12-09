USE rs_db;

INSERT INTO users (username, email, password)
VALUES
    ('alice', 'alice@example.com', 'hashed_password1'),
    ('bob', 'bob@example.com', 'hashed_password2'),
    ('charlie', 'charlie@example.com', 'hashed_password3');

-- Insert sample data into `recipes`
INSERT INTO recipes (title, description, ingredients, instructions, author_id)
VALUES
    ('Spaghetti Bolognese',
     'A classic Italian pasta dish with a rich, savory sauce.',
     'spaghetti, ground beef, tomato sauce, garlic, onion, olive oil',
     '1. Cook spaghetti. 2. Prepare sauce with beef, garlic, and tomato. 3. Combine and serve.', 
     1),

    ('Chicken Curry',
     'A flavorful and spicy chicken curry dish.',
     'chicken, curry powder, coconut milk, garlic, onion, ginger',
     '1. Cook chicken until browned. 2. Add spices and coconut milk. 3. Simmer and serve.', 
     2),

    ('Vegetable Stir Fry',
     'A quick and easy vegetable stir-fry with Asian flavors.',
     'broccoli, bell peppers, soy sauce, garlic, ginger, sesame oil',
     '1. Stir-fry vegetables in sesame oil. 2. Add soy sauce and garlic. 3. Serve hot.', 
     3),

    ('Pancakes',
     'Fluffy pancakes perfect for breakfast.',
     'flour, eggs, milk, sugar, butter',
     '1. Mix ingredients. 2. Pour batter onto a hot pan. 3. Flip when bubbly. Serve with syrup.', 
     1);
