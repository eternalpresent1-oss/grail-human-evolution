import type { Provider } from './store.ts';

export const APPLE_PRODUCT_ID = 'com.grail.humanevolution.premium.monthly';
export const GOOGLE_PRODUCT_ID = 'arche_premium_monthly';

export interface VerifiedPurchase {
  productId: string;
  expiresAt: Date | null;
  autoRenew: boolean;
}

export interface AcceptedPurchase {
  productId: string;
  status: 'active' | 'expired';
  periodEnd: Date | null;
  autoRenew: boolean;
}

export function acceptPurchase(store: Provider, purchase: VerifiedPurchase, now: Date): AcceptedPurchase | null {
  const expected = store === 'apple' ? APPLE_PRODUCT_ID : GOOGLE_PRODUCT_ID;
  if (purchase.productId !== expected) {
    return null;
  }
  const expired = purchase.expiresAt !== null && purchase.expiresAt.getTime() <= now.getTime();
  return {
    productId: purchase.productId,
    status: expired ? 'expired' : 'active',
    periodEnd: purchase.expiresAt,
    autoRenew: purchase.autoRenew,
  };
}
