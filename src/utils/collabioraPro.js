import { useEffect, useState } from "react";

/** @deprecated Legacy client-only flag (pre–server Pro). Ignored when user object has collabioraPro. */
export const COLLABIORA_PRO_STORAGE_KEY = "collabiora_pro_member";
export const COLLABIORA_PRO_UPDATED = "collabioraProUpdated";

export const COLLABIORA_PRO_UNLOCK_CODE = "5001100021292";

function readProFromStoredUser() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    if (u && u.collabioraPro === true) return true;
    if (localStorage.getItem(COLLABIORA_PRO_STORAGE_KEY) === "1") return true;
    return false;
  } catch {
    return false;
  }
}

/** Whether the signed-in account has Collabiora Pro (server flag on user + legacy localStorage). */
export function getIsCollabioraPro() {
  return readProFromStoredUser();
}

/** Merge Pro flag into stored user (e.g. after redeem API). */
export function mergeCollabioraProIntoStoredUser(nextUser) {
  try {
    if (!nextUser || typeof nextUser !== "object") return;
    localStorage.setItem("user", JSON.stringify(nextUser));
    window.dispatchEvent(new CustomEvent(COLLABIORA_PRO_UPDATED));
    window.dispatchEvent(new Event("userUpdated"));
  } catch {
    /* ignore */
  }
}

/**
 * Removes the legacy client-only Pro flag from localStorage.
 * Must run on sign-out: `user` JSON is cleared but `collabiora_pro_member` used to persist,
 * so Plans / useCollabioraPro would still show Pro until this key is removed.
 */
export function clearCollabioraProLegacyStorage() {
  try {
    localStorage.removeItem(COLLABIORA_PRO_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(COLLABIORA_PRO_UPDATED));
  } catch {
    /* ignore */
  }
}

export function useCollabioraPro() {
  const [isPro, setIsPro] = useState(readProFromStoredUser);

  useEffect(() => {
    const sync = () => setIsPro(readProFromStoredUser());
    sync();
    window.addEventListener(COLLABIORA_PRO_UPDATED, sync);
    window.addEventListener("login", sync);
    window.addEventListener("logout", sync);
    window.addEventListener("userUpdated", sync);
    const onStorage = (e) => {
      if (e.key === "user" || e.key === COLLABIORA_PRO_STORAGE_KEY || e.key === null)
        sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COLLABIORA_PRO_UPDATED, sync);
      window.removeEventListener("login", sync);
      window.removeEventListener("logout", sync);
      window.removeEventListener("userUpdated", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return isPro;
}
