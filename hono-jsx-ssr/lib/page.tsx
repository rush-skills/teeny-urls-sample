import type { PropsWithChildren } from "hono/jsx";
import { useRequestContext } from "hono/jsx-renderer";
import { $Env } from "teenybase/worker";

export function Navbar(props: { user?: string }) {
  return (
    <nav>
      <ul>
        <li>
          <a href="/">
            <strong>URL Shortener</strong>
          </a>
        </li>
      </ul>
      {props.user && (
        <ul>
          {/* <li>
            <a href="/">My URLs</a>
          </li> */}
          {/* <li>
            <a href="/url/create">Create URL</a>
          </li> */}
        </ul>
      )}
      <ul>
        {props.user && (
          <li>
            <span>{props.user}</span>
          </li>
        )}
        <li>
          {props.user ? (
            <a href="/logout">Logout</a>
          ) : (
            <a href="/login">Login</a>
          )}
        </li>
        {!props.user && (
          <li>
            <a href="/register">Register</a>
          </li>
        )}
      </ul>
    </nav>
  );
}

const Nav = async () => {
  const c = useRequestContext<$Env>();
  const db = c.get("$db");
  const loggedIn = db.auth.uid;
  return <Navbar user={loggedIn ? db.auth.jwt.user : ""} />;
};

export function BaseLayout({ children }: PropsWithChildren) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.colors.min.css"
        />
        <title>URL Shortener</title>
        <meta
          name="description"
          content="A simple URL shortener application."
        />
        <style>
          {`
      :root {
          --pico-form-element-spacing-horizontal: calc(1rem * 0.5);
          --pico-form-element-spacing-vertical: calc(0.75rem * 0.5);
          --pico-spacing: calc(1rem * 0.5);
          --pico-typography-spacing-vertical: calc(1rem * 1);
          --pico-line-height: 1.5;
          --pico-font-weight: 400;
          --pico-font-size: 110%;
      }

      .mb-4 {
          margin-bottom: 1.5rem;
      }

      .error {
          color: var(--pico-form-element-invalid-color);
      }

      nav ul:nth-of-type(2) {
          justify-content: center;
      }
    `}
        </style>
      </head>
      <body>
        <header className="container">
          <Nav />
        </header>
        <main className="container">{children}</main>
        <footer
          className="container"
          style={{ marginBottom: "1rem", textAlign: "center" }}
        >
          <small>
            Powered by <a href="https://teenybase.com">TeenyBase</a> | DollarDB
            URL Shortener
          </small>
        </footer>
      </body>
    </html>
  );
}
