import { Context } from "hono";
import { z, ZodError } from "zod";
import { FC } from "hono/jsx";
import { $Env } from "teenybase/worker";
import { parseRequestBody } from "teenybase/worker";

export type FormProps<
  T = Record<string, string | boolean | number | null | undefined | File>
> = {
  data?: T;
  error?: string;
  errors?: Record<keyof T, string | string[] | undefined>;
};

export async function formRoute<T>(
  c: Context<$Env>,
  zv: z.ZodType<T>,
  Component: FC<FormProps<T>> | ((props: FormProps<T>) => Promise<JSX.Element>),
  route: (data: T) => Promise<Response>,
  requireLogin = false,
  requireLogout = false
) {
  let error = c.req.query("error");
  let data: T | undefined = undefined;
  let errors: FormProps<T>["errors"] | undefined = undefined;

  if (requireLogin && !c.get("$db").auth.uid) {
    return c.redirect("/login?error=Please login to continue");
  }

  if (requireLogout && !!c.get("$db").auth.uid) {
    return c.redirect("/");
  }

  if (c.req.method === "POST") {
    data = (await parseRequestBody(c.req)) as T;
    const parsed = zv.safeParse(data);

    if (parsed.error) {
      errors = parsed.error.formErrors.fieldErrors as any;
      console.log(data);
      console.log(errors);
      error = "Invalid form values";
    }

    if (parsed.data) {
      data = parsed.data;
      const res = await route(parsed.data).catch((e) => {
        error = (e as any)?.message || "Unknown error";
        if (e instanceof ZodError) {
          errors = e.formErrors.fieldErrors as any;
          error = "Invalid form values";
        } else if (e?.input) {
          errors = Object.fromEntries(
            Object.entries(e.input).map(([k, v]: [string, any]) => [
              k,
              v.message,
            ])
          ) as any;
        }
        console.error({ ...e });
        return null;
      });

      if (res) {
        return res;
      }
    }
  }

  return c.render(
    await (typeof Component === "function" ? (
      Component({ data, error, errors })
    ) : (
      <Component data={data} error={error} errors={errors} />
    ))
  );
}
