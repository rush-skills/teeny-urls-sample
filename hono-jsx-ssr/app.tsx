import { Hono } from "hono";
import { $Env } from "teenybase/worker";
import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";
import { loginRoute, registerRoute } from "./lib/auth";
import { getLogin, logout } from "./auth";
import { BaseLayout } from "./lib/page";
import { z } from "zod";
import { createUrlRoute, editUrlRoute } from "./lib/url-form";
import { UrlDashboard } from "./lib/url-dashboard";

const app = new Hono<$Env>();

app.use("*", async (c, next) => {
  const db = c.get("$db");
  await db.initAuth(await getLogin(c));
  return next();
});

app.use(
  "*",
  jsxRenderer(({ children }) => <BaseLayout children={children} />, {
    stream: true,
  })
);

const zPageQuery = z.object({
  page: z.coerce.number().default(1).describe("Page number"),
  search: z.string().optional().describe("Search query"),
});

// Home/Dashboard route
app.get("/", async (c) => {
  const user = c.get("$db").auth.uid;
  if (!user) return c.redirect("/login");

  const query = zPageQuery.safeParse(c.req.query());
  if (!query.success) {
    console.error(query.error);
    return c.redirect("/");
  }

  const { page } = query.data;

  return c.render(<UrlDashboard page={page} />);
});

// Authentication routes
app.on(["get", "post"], "/login", loginRoute);
app.on(["get", "post"], "/register", registerRoute);
app.on("get", "/logout", logout);

// URL management routes
app.on(["get", "post"], "/url/create", createUrlRoute);
app.on(["get", "post"], "/url/edit/:slug", (c) =>
  editUrlRoute(c, c.req.param("slug"))
);

export const honoJSXAppSSR = app;
