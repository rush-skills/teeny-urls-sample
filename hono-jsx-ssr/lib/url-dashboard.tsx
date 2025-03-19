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
      <style>
        {`
          .url-card-grid {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 1.5rem;
          }

          @media (min-width: 768px) {
            .url-card-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (min-width: 1200px) {
            .url-card-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }

          .url-card {
            display: flex;
            flex-direction: column;
            padding: 1.5rem;
            border-radius: var(--pico-border-radius);
            border: var(--pico-border-width) solid var(--pico-form-element-border-color);
            background-color: var(--pico-card-background-color);
            height: 100%;
          }

          .url-card-header {
            margin-bottom: 1rem;
          }

          .url-card-title {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .url-card-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .url-card-stat {
            display: flex;
            font-size: 0.875rem;
            flex-direction: column;
          }

          .url-card-stat strong {
            margin-bottom: 0.25rem;
          }

          .url-card-link {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            word-break: break-all;
          }

          .url-card-footer {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
            margin-top: 1.25rem;
            padding-top: 1.25rem;
            border-top: var(--pico-border-width) solid var(--pico-form-element-border-color);
          }

          .url-card-footer a,
          .url-card-footer button {
            margin: 0;
            width: 100%;
            text-align: center;
          }
        `}
      </style>

      <div className="url-card-grid">
        {result.items.map((url: any) => (
          <div key={url.slug} className="url-card">
            <div className="url-card-header">
              <h3 className="url-card-title">{url.name}</h3>
            </div>

            <div className="url-card-content">
              <div className="url-card-stat">
                <strong>Short URL:</strong>
                <a
                  href={`${baseUrl}/l/${url.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="url-card-link"
                >
                  {`${baseUrl}/l/${url.slug}`}
                </a>
              </div>

              <div className="url-card-stat">
                <strong>Original URL:</strong>
                <a
                  href={url.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="url-card-link"
                >
                  {url.link}
                </a>
              </div>

              <div className="url-card-stat">
                <strong>Views:</strong> {url.views}
              </div>

              <div className="url-card-stat">
                <strong>Created:</strong>{" "}
                {new Date(url.created).toLocaleDateString()}
              </div>
            </div>

            <div className="url-card-footer">
              <a
                href={`/url/edit/${url.slug}`}
                role="button"
                className="secondary"
              >
                Edit
              </a>
              <form
                style={{ margin: 0 }}
                action={`/url/delete/${url.slug}`}
                method="post"
                onsubmit="return confirm('Are you sure you want to delete this URL?')"
              >
                <button type="submit" className="contrast">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

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
