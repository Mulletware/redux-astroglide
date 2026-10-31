// Universal CJS interop for redux-injectable-middleware (see astroglide.ts):
// named imports/re-exports of its CJS build break native ESM consumers, so
// resolve the namespace's default (module.exports today, explicit `.default`
// from 1.1.0+) and re-export the member as a plain const.
import * as rIMStar from "redux-injectable-middleware";

const rIM = ((rIMStar as any).default ?? rIMStar) as typeof rIMStar;

export const middleware = rIM.injectableMiddleware;
