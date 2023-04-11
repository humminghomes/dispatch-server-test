## Running the Server

1. `npm install`
2. Set up a `.env` file with Dispatch secrets

```diff
# There is an `.env.example` in the root directory you can use for reference
cp .env.example .env
```

3. Create DB

```diff
npx prisma db push
```

> You can use `npx prisma studio` to open a web browser with the DB.

4. `npm run dev` starts the server and restarts on save.
