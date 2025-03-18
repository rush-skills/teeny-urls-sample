# URL Shortener App

A URL shortener application built with [teenybase](https://teenybase.com/index.html).

> teenybase is in pre-alpha and not suitable for production use yet.

Teenybase is a serverless backend [framework] with a single file configuration and deployment on cloudflare.
It includes a sqlite database(d1), file storage(s3/r2), jwt, authentication, custom database access rules(query from frontend), email(mailgun), and more.

This repository is a URL shortener application with teenybase backend and Hono JSX SSR frontend implementation.
It can be directly cloned and run locally or deployed on cloudflare.

OpenAPI Docs - https://url-shortener.teenybase.com/api/v1/doc/ui

Frontend demo

- Hono JSX SSR - https://url-shortener.teenybase.com

## Contents

- [x] Backend in a file - [teenybase.ts](./teenybase.ts)
  - [x] urls table
    - [x] Rule based access control
  - [x] users table
    - [x] Rule based access control
    - [x] Username/email + password authentication
  - [x] RPC procedure for view increment
  - [ ] Vitest integration and backend tests
- [x] Deploy on cloudflare
  - [x] Deploy worker
  - [x] Generate schema
  - [x] Apply migrations
  - [x] Backup database
  - [ ] Restore database
  - [ ] Backup bucket
  - [ ] Restore bucket
- [x] Frontend
  - [x] Hono JSX
    - [x] Server side rendering (SSR) in worker
    - [x] Homepage with URL dashboard
    - [x] Cookie auth
    - [x] Email + password
      - [x] Login, logout
      - [x] Register/Sign up
      - [ ] Forgot password
    - [ ] Google Auth
    - [ ] Apple Auth
    - [ ] Github Auth
    - [ ] Discord Auth
    - [x] URL dashboard
    - [x] Create URL
    - [x] Edit URL
    - [x] Pagination
    - [ ] Account settings

## Main files

- [teenybase.ts](./teenybase.ts) - Database schema and settings
- [wrangler.toml](./wrangler.toml) - Cloudflare worker settings
- [worker.ts](./worker.ts) - Worker entry point with URL redirect handler
- [.dev.vars](./.dev.vars) - Development environment variables/secrets
- [.prod.vars](./.prod.vars) - Production environment variables/secrets

## Main directories

- [migrations](./migrations) - Generated Database migrations and built config. This should be committed to git.
- [.local-persist](./.local-persist) - Local database and bucket storage. This should ideally not be committed to git.
- [db_backups](./db_backups) - Database backups when doing through cli. Add it to `.gitignore` or just `db_backups/local` if you don't want to commit them.
- `.teeny` and `.wrangler` - Temporary folders created by teeny and wrangler. These should not be committed to git.

## Development

### Setup

Clone the repository and install dependencies.

```bash
git clone git+ssh://github.com/yourusername/teeny-url-shortener.git
cd teeny-url-shortener
npm install
```

Create `.dev.vars` and `.prod.vars` files from `sample.vars`

```bash
cp sample.vars .dev.vars
cp sample.vars .prod.vars
```

Set the values for jwt secrets, admin tokens and other variables in `.dev.vars` and `.prod.vars` (and make sure they are added to `.gitignore` not committed to git). These secrets are referenced in the database settings(`teenybase.ts` file) with a `$` sign.

Next, Run migrations to create the database with tables.

```bash
npm run migrate
```

Respond with `y` to apply the migrations.

The local database is saved as `Miniflare` object with `sqlite` files in the `.local-persist` folder. To reset the local database, simply delete this folder and run `npm run migrate` again

Once the database is created, we can execute commands to add data like admin users, restore backups etc. To add a superadmin user -

```bash
npm run exec -- users/insert -m post -b '{"values":{"name":"admin","username":"admin","role":"superadmin","email":"admin@example.com","password":"admin123456","passwordConfirm":"admin123456"},"returning":"*"}'
# or teeny exec --local users/insert -m post -b '{"values":{"name":"admin","username":"admin","role":"superadmin","email":"admin@example.com","password":"admin123456","passwordConfirm":"admin123456"},"returning":"*"}'
```

> if `teeny` does not work, use `npx teeny` instead of `teeny`

The user can be removed like - `teeny exec --local users/delete -m post -b '{"where":"username=\"admin\"","returning":"*"}'`

### Run

To start the development server, run

```bash
npm run dev
# or teeny dev --local
```

Open the browser and navigate to http://localhost:8787 to see the app.

The OpenAPI docs UI (Swagger) is available at http://localhost:8787/api/v1/doc/ui

## Production

### First Deployment

Initial Setup -

- Run `wrangler login` and follow steps to login to cloudflare account. This would create a token and save it to the local machine.
- Update `wrangler.toml`
  - set the `name` property. The `name` is the name of the worker in cloudflare.
  - set the `account_id`(cloudflare account id) property. This can be found in the cloudflare dashboard.
  - optionally, comment/uncomment `observability` for logging and metrics.
  - update/remove flags `RESPOND_WITH_ERRORS` and `RESPOND_WITH_QUERY_LOG`
- Create the resources like the d1 database and r2 bucket needs to be created in the cloudflare account.
  - create D1 Database

```bash
wrangler d1 create teeny-url-shortener --location weur
```

- copy the database name and uid and paste in the `database_name` and `database_id` fields(under `d1_databases->PRIMARY_DB`) in `wrangler.toml` file.
- optionally, create another database and copy the database uid for `preview_database_id` field in `wrangler.toml` file. This will be used when using `--remote` option with `dev`
- create the bucket

```bash
wrangler r2 bucket create teeny-url-shortener --location weur
```

- copy the bucket name and paste in the `bucket_name` field(under `r2_buckets->PRIMARY_R2`) in `wrangler.toml` file. DONT change the binding (PRIMARY_R2)
- optionally, create another bucket and copy the bucket name for `preview_bucket_name` field in `wrangler.toml` file. This will be used when using `--remote` option with `dev`
- Deploy the worker

```bash
npm run deploy
```

This would deploy the worker and set the secrets.

- Copy the deployed route and set it as `API_ROUTE` in `.prod.vars` file. This should look like `https://<worker-name>.<account-name>.workers.dev` unless a different route is set in `wrangler.toml` file. This step is required to apply the migrations in the db from next time.

> When running in production environment, remove the flags `RESPOND_WITH_ERRORS` and `RESPOND_WITH_QUERY_LOG` in `wrangler.toml` which are used for debugging in rest api.

> The resources can be created in the following locations (as per cloudflare). This is only required for the db and bucket and not the worker as it will be spawned on the edge.
>
> - wnam Western North America
> - enam Eastern North America
> - weur Western Europe
> - eeur Eastern Europe
> - apac Asia-Pacific
> - oc Oceania

> Creation of resources from config will be automated in future versions of teenybase.

Next, deploy the worker to cloudflare.

```bash
npm run deploy
# or teeny deploy --migrate --remote
# or teeny migrate --deploy --remote
```

On first deployment, the worker will be deployed and database migrations will be applied. On subsequent deployments, the migrations will be applied first, and then the worker will be deployed.

> `teeny deploy` is same as `teeny migrate` as it first migrates the database and then deploys the worker.
> In the example `npm run deploy` is used, which is same as `teeny migrate --remote`.

If this is the first deployment, the secrets will automatically be uploaded from .prod.vars file. Make sure the secrets are set properly in the `.prod.vars` file.

Optionally create a superadmin account or insert other data using exec command -

```bash
teeny exec --remote users/insert -m post -b '{"values":{"name":"admin","username":"admin","role":"superadmin","email":"admin@example.com","password":"admin123456","passwordConfirm":"admin123456"},"returning":"*"}'
```

### Deploy

To update the worker with new migrations, or worker changes, simply run the deployment again

```bash
npm run deploy
# or teeny deploy --migrate --remote
```

If there are any migrations required, it will prompt to apply them. Respond with `y` to apply the migrations.

### Secrets

The secrets are uploaded automatically when deploying the worker for the first time.
To upload the secrets manually or to update after first deployment, edit the file `.prod.vars` and run

```bash
teeny secrets upload --remote
```

> Note - If any secret is removed from the `.prod.vars` file and uploaded, it will not be removed from the cloudflare secrets. It will need to be removed manually from the cli or the cloudflare dashboard.

### Backup

To backup the remote or local database, run

```bash
teeny backup --remote
# or teeny backup --local
```

This will create a backup of the database settings, schema and sql data in the `db_backups/[local|remote]` folder.
This will not backup the files in the r2 bucket, that must be done separately. Check the teenybase docs for more details.

### Build

To create a worker build, run

```bash
npm run build
# or teeny build --local
```

This is only required for testing, and not for deployment as a worker build is created automatically when deploying.

### Settings and schema

The database schema, rules and other backend settings are defined as JSON in [teenybase.ts](./teenybase.ts).

The settings can be directly edited in the file. After editing the file, migrations needs to be generated and applied to see the effects.

The generated migrations and built settings are stored in the `migrations` folder.
This folder is supposed to be committed to version control(git) but files in this folder should not be edited manually.
Any change will be reset the next time migrations are generated.
This folder can be safely deleted, as it will be generated again when running `generate` or `migrate`.

#### Generate

To validate the database settings and schema, and generate the settings json and migrations, run

```bash
npm run generate
# or teeny generate --local
```

This will compile the `teenybase.ts` file and generate `migrations/next-config.json` and `migrations/xxx_create_table_xxxx.sql` files.

This step is optional and can be skipped as latest migrations are generating every time migrate or deploy is run.

#### Migrate

To apply the migrations and update the database with the settings, run

```bash
npm run migrate
# or teeny migrate --local
```

This will first run generate, then apply the un-applied migrations to the database, and also update the `migrations/config.json` file with the latest settings from `teenybase.ts` file.

The `migrations/config.json` file contains the built database settings and schema that the backend uses. This file is imported and used in `worker.ts` file.

### Email Setup

Sending emails for email verification, password reset etc. is done using the `mailgun` service.
An account can be created at [mailgun.com](https://www.mailgun.com/) which gives 100 emails/day for free on a custom domain.

Once a mailgun account is created, set the details in `teenybase.ts` file under `email`.

> Note - The keys (`MAILGUN_API_KEY` and `MAILGUN_WEBHOOK_SIGNING_KEY`) should be set in the `.dev.vars` and `.prod.vars` files and referenced in the `teenybase.ts` file with a `$` sign, similar to other secrets.

Optionally, to log mailgun errors and receive them on discord

- add webhooks in mailgun to `https://YOUR_DEPLOYMENT/api/v1/mailgun/webhook/url-shortener-app` for all the events you would like to be notified about.
- add a webhook to a discord server(server settings -> Integrations -> webhooks) and add the url/id to `DISCORD_MAILGUN_NOTIFY_WEBHOOK` in `teenybase.ts->email->mailgun`

## URL Shortener Specifics

### Short URL Format

The application generates short URLs in the format:

```
https://your-deployment.com/l/your-slug
```

When a user visits this URL, they are automatically redirected to the original destination URL, and the view count is incremented.

### Slug Requirements

- Each slug must be unique in the system
- Slugs are case-sensitive
- Only alphanumeric characters, hyphens, and underscores are recommended for compatibility

### Using the Application

1. **Create an account** - Register with an email and password
2. **Create URLs** - Add your long URLs and assign custom slugs
3. **Share Short URLs** - Share your shortened URLs with others
4. **Track Usage** - Monitor how many times your links have been visited

### API Usage

The application provides a REST API that can be used programmatically:

- Create a short URL:

```bash
curl -X POST https://your-deployment.com/api/v1/table/urls/insert \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"values":{"name":"Example URL","link":"https://example.com/very/long/url/path","slug":"ex1","created_by":"YOUR_USER_ID"},"returning":"*"}'
```

- Get your URLs:

```bash
curl -X GET "https://your-deployment.com/api/v1/table/urls/select?where=created_by=\"YOUR_USER_ID\"" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

See the API documentation for more details at `/api/v1/doc/ui`.
