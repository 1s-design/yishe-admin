import { ADMIN_ONLY_MENU_KEYS } from "@/constants/access-control";

function readConfiguredMenuKeys(setting: any) {
  if (!setting || typeof setting !== "object") {
    return { configured: false, keys: [] as string[] };
  }

  const rawMenuAccess =
    setting.menuAccess && typeof setting.menuAccess === "object"
      ? setting.menuAccess
      : null;
  const rawAccessControl =
    setting.accessControl && typeof setting.accessControl === "object"
      ? setting.accessControl
      : null;
  const configured = !!rawMenuAccess || !!rawAccessControl;
  const keys = Array.isArray(rawAccessControl?.effectiveMenuKeys)
    ? rawAccessControl.effectiveMenuKeys
    : Array.isArray(rawMenuAccess?.keys)
      ? rawMenuAccess.keys
      : Array.isArray(rawAccessControl?.menuKeys)
        ? rawAccessControl.menuKeys
        : [];

  return {
    configured,
    keys: Array.from(
      new Set(
        keys.map((item: any) => String(item || "").trim()).filter(Boolean),
      ),
    ),
  };
}

const ALWAYS_ALLOW_ROUTE_NAMES = new Set([
  "Root",
  "RedirectRoot",
  "Redirect",
  "Login",
  "NoAccess",
  "NoFound",
  "Error",
  "UserProfileCompat",
  "IndependentSite",
  "PublicUserBehaviorLog",
]);

export function hasRouteMenuAccess(route: AppRouteRecordRaw, user: any) {
  const { configured, keys } = readConfiguredMenuKeys(user?.setting);
  const isAdmin = !!user?.isAdmin;
  const routeName = String(route.name || "").trim();
  const menuKey = String(route.meta?.menuKey || "").trim();
  const legacyMenuKeys = Array.isArray(route.meta?.legacyMenuKeys)
    ? route.meta.legacyMenuKeys
        .map((item: any) => String(item || "").trim())
        .filter(Boolean)
    : [];
  const acceptedMenuKeys = [menuKey, ...legacyMenuKeys].filter(Boolean);

  if (ALWAYS_ALLOW_ROUTE_NAMES.has(routeName)) {
    return true;
  }

  if (route.meta?.hidden && route.meta?.noTagsView && !menuKey) {
    return false;
  }

  if (menuKey) {
    if (isAdmin) {
      return true;
    }

    if (route.meta?.requiresAdmin || ADMIN_ONLY_MENU_KEYS.has(menuKey)) {
      return false;
    }

    if (configured) {
      return acceptedMenuKeys.some((key) => keys.includes(key));
    }

    // 未配置权限时，默认允许工作台页面、个人设置、我的组织
    if (menuKey === "personal.settings" || menuKey.startsWith("home.") || menuKey === "personal.organization") {
      return true;
    }

    return false;
  }

  return true;
}
