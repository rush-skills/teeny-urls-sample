import { useRequestContext } from "hono/jsx-renderer";
import { $Env } from "teenybase/worker";
import { Suspense } from "hono/jsx";

const pageSize = 10;

export const UrlDashboard = ({ page = 1 }: { page?: number }) => {
  return (
    <div className="container">
      <header className="mb-4">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1>My Shortened URLs</h1>
          <a href="/url/create" role="button">
            Create New URL
          </a>
        </div>
      </header>

      <Suspense fallback={<div aria-busy="true">Loading your URLs...</div>}>
        <UrlList page={page} />
      </Suspense>
    </div>
  );
};

const UrlList = async ({ page }: { page: number }) => {
  const c = useRequestContext<$Env>();
  const db = c.get("$db");
  const userId = db.auth.uid;

  if (!userId) {
    return (
      <p>
        Please <a href="/login">login</a> to view your URLs.
      </p>
    );
  }

  // Fetch the user's URLs
  const offset = (page - 1) * pageSize;
  const result = await db
    .table("urls")
    .select(
      {
        select: "name, link, slug, views, created, updated",
        where: `created_by = "${userId}"`,
        limit: pageSize,
        offset,
        order: "-created",
      },
      true
    )
    .catch((e) => {
      console.error(e);
      return { items: [], total: 0 };
    });

  const baseUrl = new URL(c.req.url).origin;
  const totalPages = Math.ceil(result.total / pageSize);

  if (result.items.length === 0) {
    return (
      <div>
        <article>
          <p>You haven't created any shortened URLs yet.</p>
          <p>
            <a href="/url/create" role="button">
              Create Your First URL
            </a>
          </p>
        </article>
      </div>
    );
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Short URL</th>
            <th>Original URL</th>
            <th>Views</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((url: any) => (
            <tr key={url.slug}>
              <td>{url.name}</td>
              <td>
                <a
                  href={`${baseUrl}/l/${url.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {`${baseUrl}/l/${url.slug}`}
                </a>
              </td>
              <td>
                <a
                  href={url.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "inline-block",
                  }}
                >
                  {url.link}
                </a>
              </td>
              <td>{url.views}</td>
              <td>{new Date(url.created).toLocaleDateString()}</td>
              <td>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <a
                    href={`/url/edit/${url.slug}`}
                    role="button"
                    className="secondary"
                  >
                    Edit
                  </a>
                  <form
                    method="post"
                    action={`/api/v1/table/urls/delete`}
                    style={{ margin: 0 }}
                  >
                    <input
                      type="hidden"
                      name="where"
                      value={`slug = "${url.slug}"`}
                    />
                    <input type="hidden" name="returning" value={`["slug"]`} />
                    <button type="submit" className="contrast">
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <nav
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "2rem",
          }}
        >
          <ul>
            <li>
              <a
                href={`/?page=${page > 1 ? page - 1 : 1}`}
                aria-disabled={page === 1}
              >
                Previous
              </a>
            </li>
            <li>
              <span>
                Page {page} of {totalPages}
              </span>
            </li>
            <li>
              <a
                href={`/?page=${page < totalPages ? page + 1 : totalPages}`}
                aria-disabled={page === totalPages}
              >
                Next
              </a>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
};
