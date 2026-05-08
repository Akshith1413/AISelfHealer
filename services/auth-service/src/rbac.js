const ROLES = {
  super_admin: ["*"],
  tenant_admin: ["users:*", "data:*", "alerts:*", "chaos:run", "healing:run"],
  operator: ["alerts:read", "healing:run", "chaos:run", "metrics:read"],
  viewer: ["alerts:read", "metrics:read", "dashboard:read"],
  ai_engineer: ["metrics:read", "models:*", "alerts:read"]
};

function permissionsFor(roles = []) {
  return [...new Set(roles.flatMap((role) => ROLES[role] || []))];
}

module.exports = { ROLES, permissionsFor };

