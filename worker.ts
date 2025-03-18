import {
  $Database,
  $Env,
  OpenApiExtension,
  teenyHono,
  PocketUIExtension,
} from "teenybase/worker";
import config from "./migrations/config.json";
import { honoJSXAppSSR } from "./hono-jsx-ssr/app";

export interface Env {
  Bindings: $Env["Bindings"] & {
    PRIMARY_DB: D1Database;
    PRIMARY_R2?: R2Bucket;
  };
  Variables: $Env["Variables"];
}

const app = teenyHono<Env>(
  async (c) => {
    const db = new $Database(c, config, c.env.PRIMARY_DB, c.env.PRIMARY_R2);
    db.extensions.push(new OpenApiExtension(db, true));
    db.extensions.push(new PocketUIExtension(db));
    return db;
  },
  undefined,
  {
    logger: false,
    cors: false,
  }
);

// URL shortener redirect route
app.get("/l/:slug", async (c) => {
  const db = c.get("$db");
  const slug = c.req.param("slug");

  try {
    // Create a URL object to get the origin
    const url = new URL(c.req.url);
    const origin = url.origin;

    // First get the URL data using the view endpoint
    const response = await fetch(`${origin}/api/v1/table/urls/view/${slug}`);

    if (!response.ok) {
      return c.text("URL not found", 404);
    }

    const urlData = (await response.json()) as any;

    if (urlData && urlData.link) {
      // Increment the view count after successful retrieval but before redirect
      await fetch(`${origin}/api/v1/rpc/increment_view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      // Redirect to the target URL
      return c.redirect(urlData.link);
    } else {
      // URL not found or invalid
      return c.text("URL not found", 404);
    }
  } catch (error) {
    console.error("Error redirecting URL:", error);
    return c.text("An error occurred while processing your request", 500);
  }
});

// Main application routes
app.route("/", honoJSXAppSSR);

export default app;
