import {
  DatabaseSettings,
  sql,
  sqlValue,
  TableAuthExtensionData,
  TableData,
  TableFieldUsageRecord,
  TableRulesExtensionData,
} from "teenybase";
import {
  authFields,
  baseFields,
  createdTrigger,
} from "teenybase/scaffolds/fields";

const userTable: TableData = {
  name: "users",
  // r2Base: "users",
  autoSetUid: true, // automatically set the uid to a random uuidv4
  fields: [...baseFields, ...authFields],
  indexes: [{ fields: "role COLLATE NOCASE" }],
  extensions: [
    {
      name: "rules",
      listRule:
        "(auth.uid == id) | auth.role ~ '%admin' | meta->>'$.pvt'!=true",
      viewRule: "(auth.uid == id) | auth.role ~ '%admin'",
      createRule:
        "(auth.uid == null & role == 'guest') | (auth.role ~ '%admin' & role != 'superadmin')",
      updateRule:
        "(auth.uid == id & role == new.role & meta == new.meta) | (auth.role ~ '%admin' & new.role != 'superadmin' & (role != 'superadmin' | auth.role = 'superadmin'))",
      deleteRule: "auth.role ~ '%admin' & role !~ '%admin'",
    } as TableRulesExtensionData,
    {
      name: "auth",
      passwordType: "sha256",
      passwordCurrentSuffix: "Current",
      passwordConfirmSuffix: "Confirm",
      jwtSecret: "$JWT_SECRET_USERS",
      jwtTokenDuration: 3 * 60 * 60, // 3 hours
      maxTokenRefresh: 4, // 12 hours
      emailTemplates: {
        verification: {
          variables: {
            message_title: "Email Verification",
            message_description:
              "Welcome to {{APP_NAME}}. Click the button below to verify your email address.",
            message_footer:
              "If you did not request this, please ignore this email.",
            action_text: "Verify Email",
            action_link: "{{APP_URL}}#/verify-email/{{TOKEN}}",
          },
        },
        passwordReset: {
          variables: {
            message_title: "Password Reset",
            message_description:
              "Click the button below to reset your password for your {{APP_NAME}} account.",
            message_footer:
              "If you did not request this, you can safely ignore this email.",
            action_text: "Reset Password",
            action_link: "{{APP_URL}}#/reset-password/{{TOKEN}}",
          },
        },
      },
    } as TableAuthExtensionData,
  ],
  triggers: [
    // raise an error if created column is updated (optional)
    createdTrigger,
  ],
};

const urlsTable: TableData = {
  name: "urls",
  autoSetUid: true, // automatically set the uid to a random uuidv4
  fields: [
    // {
    //   name: "id",
    //   primary: true,
    //   type: "text",
    //   sqlType: "text",
    //   notNull: true,
    //   noUpdate: true,
    // },
    { name: "name", type: "text", sqlType: "text", notNull: true },
    { name: "link", type: "text", sqlType: "text", notNull: true },
    {
      name: "slug",
      type: "text",
      sqlType: "text",
      unique: true,
      notNull: true,
      usage: TableFieldUsageRecord.record_uid,
    },
    {
      name: "views",
      type: "number",
      sqlType: "integer",
      noUpdate: true,
      default: sqlValue(0),
    },
    {
      name: "created_by",
      type: "relation",
      sqlType: "text",
      notNull: true,
      foreignKey: { table: "users", column: "id" },
    },

    {
      name: "created",
      type: "date",
      sqlType: "timestamp",
      default: sql`CURRENT_TIMESTAMP`,
      notNull: true,
      usage: TableFieldUsageRecord.record_created,
      noInsert: true,
      noUpdate: true,
    },
    {
      name: "updated",
      type: "date",
      sqlType: "timestamp",
      default: sql`CURRENT_TIMESTAMP`,
      notNull: true,
      usage: TableFieldUsageRecord.record_updated,
      noInsert: true,
      noUpdate: true,
    },
  ],
  indexes: [
    { fields: "created_by" },
    { fields: "slug COLLATE NOCASE", unique: true },
  ],
  extensions: [
    {
      name: "rules",
      // Anyone can view a URL's details
      viewRule: "true",
      // Users can only list their own URLs, admins can list all
      listRule:
        "auth.role ~ '%admin' | (auth.uid != null & created_by == auth.uid)",
      // Authenticated users can create URLs they own
      createRule: "auth.uid != null & created_by == auth.uid",
      // Users can update their own URLs without changing ownership, admins can update any
      updateRule:
        "auth.role ~ '%admin' | (auth.uid != null & created_by == auth.uid & created_by == new.created_by)",
      // Users can delete their own URLs, admins can delete any
      deleteRule:
        "auth.role ~ '%admin' | (auth.uid != null & created_by == auth.uid)",
    } as TableRulesExtensionData,
  ],
  triggers: [
    // raise an error if created column is updated (optional)
    createdTrigger,
  ],
};

export default {
  tables: [userTable, urlsTable],
  appName: "Teeny URL Shortener",
  appUrl: "https://url-shortener.teenybase.com",
  jwtSecret: "$JWT_SECRET_MAIN",
  email: {
    from: "Sender Name <noreply@example.com>",
    tags: ["tag-1"],
    variables: {
      company_name: "Company",
      company_copyright: "Company",
      company_address: "Company address",
      support_email: "support@example.com",
      company_url: "https://example.com",
    },
    mailgun: {
      MAILGUN_API_SERVER: "mail.example.com",
      // MAILGUN_API_URL: "https://api.mailgun.net/v3/"
      MAILGUN_API_KEY: "$MAILGUN_API_KEY",
      MAILGUN_WEBHOOK_SIGNING_KEY: "$MAILGUN_WEBHOOK_SIGNING_KEY",
      MAILGUN_WEBHOOK_ID: "url-shortener-app",
      DISCORD_MAILGUN_NOTIFY_WEBHOOK: "xxxxxxxxx",
      // EMAIL_BLOCKLIST: "a.com,b.com" // comma separated list of domains
    },
  },
  procedures: [
    {
      name: "increment_view",
      rule: false, // run as admin
      params: ["slug"],
      query: [
        {
          type: "UPDATE",
          table: "urls",
          set: { views: sql`views + 1` },
          where: sql`slug = {:slug}`,
          returning: ["link"],
        },
      ],
    },
  ],
} satisfies DatabaseSettings;
