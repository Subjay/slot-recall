import { account } from "./account";
import { accountRelations, sessionRelations, userRelations } from "./relations";
import { session } from "./session";
import { user } from "./user";
import { verification } from "./verification";
import { rateLimit } from "./rate-limit";

export const schemaDefinitons = {
  account,
  user,
  userRelations,
  accountRelations,
  session,
  sessionRelations,
  verification,
  rateLimit,
};
