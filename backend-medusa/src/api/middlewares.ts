import { defineMiddlewares } from "@medusajs/framework/http";
import { requireSettingsAccess } from "./utils/require-settings-access";

/**
 * Redirect GET / to /home so the Techpotli landing is reachable.
 * Medusa's route sorter drops the root path "/", so we serve the landing at /home
 * and redirect "/" here.
 *
 * Users & Developer access: only emails in ALLOWED_SETTINGS_ACCESS_EMAILS (env) or users with
 * metadata.can_access_users_developer can access Users and Developer sections. No email in code.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/*",
      methods: ["GET"],
      middlewares: [
        (req, res, next) => {
          if (req.path === "/" || req.path === "") {
            res.redirect(302, "/home");
            return;
          }
          next();
        },
      ],
    },
    {
      matcher: /^\/admin\/(users|invites|api-keys|hooks|workflows-executions|index)(\/|$)/,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requireSettingsAccess],
    },
  ],
});
