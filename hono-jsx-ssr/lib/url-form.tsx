import { FormProps, formRoute } from "../forms";
import { ErrorCard, FormInput } from "./form";
import { z } from "zod";
import { Context } from "hono";
import { $Database, $Env } from "teenybase/worker";
import { randomString } from "teenybase";
import { HTTPException } from "hono/http-exception";

export function UrlFormCard(props: FormProps) {
  const isEdit = !!props.data?.slug && props.data.slug !== "";

  return (
    <article style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>{isEdit ? "Edit" : "Create"} URL</h1>
      <form
        action={isEdit ? `/url/edit/${props.data?.slug}` : "/url/create"}
        method="post"
      >
        {props.error && <ErrorCard error={props.error} />}

        <FormInput
          name="name"
          placeholder="Enter a descriptive name"
          label="Name"
          required
          data={props.data}
          errors={props.errors}
        />

        <FormInput
          name="link"
          placeholder="https://example.com/your-long-url"
          label="Destination URL"
          required
          data={props.data}
          errors={props.errors}
        />

        <FormInput
          name="slug"
          placeholder="your-custom-slug"
          label="URL Slug"
          required
          data={props.data}
          errors={props.errors}
        />

        {/* Hidden fields */}
        <input
          type="hidden"
          name="created_by"
          value={props.data?.created_by || ""}
        />
        {isEdit && (
          <input
            type="hidden"
            name="original_slug"
            value={props.data?.slug || ""}
          />
        )}

        <hr />
        <div style={{ display: "flex", gap: "1rem" }}>
          <a href="/" role="button" className="secondary">
            Cancel
          </a>
          <button type="submit" style={{ flex: 1 }}>
            {isEdit ? "Save" : "Create"} URL
          </button>
        </div>
      </form>
    </article>
  );
}

export const zCreateUrl = z.object({
  name: z.string().min(1, "Name is required"),
  link: z.string().url("Please enter a valid URL").min(1, "URL is required"),
  slug: z.string().min(1, "Slug is required"),
  created_by: z.string(),
});

export const createUrlRoute = (c: Context<$Env>) =>
  formRoute(
    c,
    zCreateUrl,
    UrlFormCard,
    async (data) => {
      const db = c.get("$db");
      if (!db.auth.uid) return c.redirect("/login");

      // Always set the created_by to the current user
      const urlData = {
        ...data,
        created_by: db.auth.uid,
      };

      // Create the URL
      const result = await db.table("urls").insert({
        values: urlData,
        returning: "id",
      });

      if (!result.length) {
        throw new Error("Unable to create URL. Please try again.");
      }

      return c.redirect("/");
    },
    true // Require login
  );

export async function getUrl(db: $Database, slug: string) {
  const urls = await db.table("urls").select({
    select: "name, link, slug, views, created_by",
    where: `slug = "${slug}"`,
    limit: 1,
  });

  return urls.length ? urls[0] : null;
}

export const EditUrlCard = async (c: Context<$Env>, slug: string) => {
  const db = c.get("$db");
  const url = await getUrl(db, slug);

  if (!url) {
    throw new HTTPException(404, { message: "URL not found" });
  }

  // Check if user owns this URL or is admin
  if (url.created_by !== db.auth.uid && !db.auth.jwt?.role?.includes("admin")) {
    throw new HTTPException(401, {
      message: "You do not have permission to edit this URL",
    });
  }

  return async (props: FormProps) => {
    props.data = { ...url, ...props.data };
    return <UrlFormCard {...props} />;
  };
};

export const zEditUrl = z.object({
  name: z.string().min(1, "Name is required"),
  link: z.string().url("Please enter a valid URL").min(1, "URL is required"),
  slug: z.string().min(1, "Slug is required"),
  original_slug: z.string(),
  created_by: z.string(),
});

export const editUrlRoute = async (c: Context<$Env>, slug: string) =>
  formRoute(
    c,
    zEditUrl,
    await EditUrlCard(c, slug),
    async (data) => {
      const db = c.get("$db");

      // Ensure created_by doesn't change
      const url = await getUrl(db, slug);
      if (url?.created_by !== data.created_by) {
        throw new Error("Cannot change URL ownership");
      }

      // Update the URL
      const result = await db.table("urls").update({
        setValues: {
          name: data.name,
          link: data.link,
          slug: data.slug,
        },
        where: `slug = "${data.original_slug}"`,
        returning: "slug",
      });

      if (!result.length) {
        throw new Error("Unable to update URL. Please try again.");
      }

      return c.redirect("/");
    },
    true // Require login
  );
