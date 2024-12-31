# RecipeStash

**RecipeStash** is a recipe sharing and viewing platform

## Features
- **Homepage**: Displays random recipes, including some fetched from the Spoonacular API
- **Recipe Details**: Each recipe includes titles, descriptions, instructions, ingredients, and tags.
- **Search & Filter**: Users can search and filter recipes by various attributes.
- **User Features**:
  - Logged-in users can:
    - Create and publish recipes.
    - Save recipes for later.
    - View their own published and saved recipes in their profile.
    - Manage or delete their own recipes.
  - Recipes saved by users are linked back to their publishers. Recipes from Spoonacular link to their respective authors.

---

## Setting Up the Server

### Prerequisites
Ensure you have the following installed (minimum versions tested):
- **Node.js**: v18.17.0
- **npm**: v9.6.7
- **MySQL**: v9.0.1

### Guide

1. **Clone the Repository**
   ```bash
   git clone https://github.com/MoShahid23/recipe-stash.git
   cd recipe-stash
   ```

2. **Set Environment Variables**
   Create a `.env` file in the project root directory and define the following variables:
   ```env
    # Secret key for express-session
    SECRET_ARRAY='[]'

    # Database Configuration
    DB_HOST=your-mysql-server-host    # The MySQL server address (e.g., localhost or an IP)
    DB_USER=your-database-username    # Username for your MySQL user
    DB_PASSWORD=your-database-password    # Password for your MySQL user
    DB_NAME=rs_db    # The database name (default is rs_db, can be customized)

    # MySQL root password (used only during mysql database setup in step 4)
    DB_PASSWORD_ROOT=your-mysql-root-password

    # Spoonacular API Key (get it from Spoonacular's website)
    SPOONACULAR_API_KEY=your-spoonacular-api-key

   ```

3. **Install Dependencies**
   Run the following command in the project root directory:
   ```bash
   npm install
   ```

4. **Set Up the Database**
   Navigate to the `db` folder:
   ```bash
   cd ./db
   ```
   Run the database setup script:
   ```bash
   node load-database.js
   ```
   - This will:
     - Create the database user specified in .env (if not already existing).
     - Initialize the application database.
   - To seed the database with sample data, include the `seed` argument:
     ```bash
     node load-database.js seed
     ```

5. **Modify Configuration (optional)**
   - In the `index.js` file in the root directory:
     - Adjust the `port` variable for the desired port.
     - Update the `baseUrl` if running in a shared hosting environment

6. **Run the Server**
   Return to the project root directory and start the server:
   ```bash
   node index.js
   ```
   - The server will be live, and the website will be ready to visit.

---
