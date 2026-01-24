declare module "redux-injectable-middleware" {
  import { Middleware } from "@reduxjs/toolkit";

  export const injectableMiddleware: Middleware;
  export function injectMiddleware(middleware: Middleware): void;
}
