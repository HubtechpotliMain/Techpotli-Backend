import { defineMiddlewares } from "@medusajs/framework/http";

/**
 * Redirect GET / to /home so the Techpotli landing is reachable.
 * Medusa's route sorter drops the root path "/", so we serve the landing at /home
 * and redirect "/" here.
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
  ],
});
