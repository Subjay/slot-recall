import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
  recipes: ["create", "update", "delete", "view"],
} as const;

export const accessControl = createAccessControl(statement);

export const adminRole = accessControl.newRole({
  recipes: ["create", "update", "delete", "view"],
  ...adminAc.statements, // user: 'create' 'list' 'set-role' 'ban' 'impersonate' 'impersonate-admins' 'delete' 'set-password' AND session: 'list' 'revoke' 'delete'
});

export const userRole = accessControl.newRole({
  recipes: ["create", "update", "delete", "view"],
});

export const guestRole = accessControl.newRole({
  recipes: ["view"],
});
