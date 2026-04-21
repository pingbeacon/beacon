### TL;DR

```bash
laravel new app --using=intentui/laravel
```

Make sure to update your `APP_URL` in the `.env` file before using the route function. Then, run `bun run dev` to generate and watch routes properly during development.

### Laravel Inertia React with TypeScript

By default, packages like Laravel Breeze use regular JavaScript for React. However, this project is tailored for those who want an Inertia.js boilerplate with TypeScript.

#### Features

- Authentication
- User Profile
- User Password
- User Deletion

### Quick Login

This project includes a quick login feature. Simply add `/dev/login/{user_id}` to the URL to log in as a specific user.

Example:

```text
http://localhost:8000/dev/login/1
```

This feature is only available in development mode (`APP_ENV=local` in `.env`). Ensure that a user with the specified ID exists in your database.

### Default Branch Renaming

The **9.x** branch is now named **laravel-9.x**.

If you have a local clone, you can update it accordingly.
