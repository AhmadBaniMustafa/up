# Fake Demo Website

A simple Node.js application that simulates a blog with automatic content generation.

## Features
- **Automatic Content**: Generates a new article every 10 minutes.
- **Admin Panel**: Manually generate or delete articles.
- **Public Feed**: View all generated articles.
- **Tech Stack**: Node.js, Express, SQLite, EJS.

## Prerequisites
- Node.js installed.

## Installation

1.  Clone the repository or download the source code.
2.  Install dependencies:
    ```bash
    npm install
    ```
    *Note: If you encounter issues with `sqlite3` on Windows, try running `npm rebuild` or ensure python/build tools are available, or just try running `npm install` again.*

## Running the Application

1.  Initialize the database (first run only):
    ```bash
    node db/init.js
    ```
2.  Start the server:
    ```bash
    npm start
    ```
3.  Open code `http://localhost:3000` to view the blog.
4.  Open `http://localhost:3000/admin` to manage articles.

## API Endpoints

- `GET /`: Home page.
- `GET /admin`: Admin dashboard.
- `POST /api/generate-article`: Trigger manual article generation.
- `POST /api/delete-article/:id`: Delete an article.
