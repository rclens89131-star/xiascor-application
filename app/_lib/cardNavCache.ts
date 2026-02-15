export type XsCardNavItem = any;

/**
 * XS_CARD_NAV_CACHE_V1
 * Cache mémoire ultra simple pour passer l'objet carte à l'écran détail.
 * (Évite refetch backend dans V1)
 */
const XS_CARD_NAV_MAP = new Map<string, XsCardNavItem>();

export function xsCardNavSet(id: string, card: XsCardNavItem) {
  if (!id) return;
  XS_CARD_NAV_MAP.set(String(id), card);
}

export function xsCardNavGet(id: string): XsCardNavItem | null {
  if (!id) return null;
  return XS_CARD_NAV_MAP.get(String(id)) ?? null;
}

export function xsCardNavClear(id?: string) {
  if (!id) {
    XS_CARD_NAV_MAP.clear();
    return;
  }
  XS_CARD_NAV_MAP.delete(String(id));
}