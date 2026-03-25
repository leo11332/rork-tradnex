import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';

const ENTITLEMENT_ID = 'premium';

function getRCApiKey(): string {
  if (__DEV__ || Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '';
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '',
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '',
  }) ?? '';
}

let isConfigured = false;

export function configureRevenueCat(): void {
  const apiKey = getRCApiKey();
  if (!apiKey) {
    console.log('[revenuecat] No API key found, skipping configuration');
    return;
  }
  if (isConfigured) {
    console.log('[revenuecat] Already configured, skipping');
    return;
  }

  try {
    void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    isConfigured = true;
    console.log('[revenuecat] Configured successfully', {
      platform: Platform.OS,
      isDev: __DEV__,
      keyPrefix: apiKey.substring(0, 12) + '...',
    });
  } catch (error) {
    console.log('[revenuecat] Configuration error:', error);
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    console.log('[revenuecat] Fetching offerings...');
    const offerings = await Purchases.getOfferings();
    console.log('[revenuecat] Offerings fetched:', {
      hasCurrentOffering: Boolean(offerings.current),
      packageCount: offerings.current?.availablePackages?.length ?? 0,
    });
    return offerings.current ?? null;
  } catch (error) {
    console.log('[revenuecat] getOfferings error:', error);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<{ success: boolean; customerInfo: CustomerInfo | null; error?: string }> {
  try {
    console.log('[revenuecat] Purchasing package:', pkg.identifier);
    const result = await Purchases.purchasePackage(pkg);
    const isPro = result.customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    console.log('[revenuecat] Purchase result:', { isPro, activeEntitlements: Object.keys(result.customerInfo.entitlements.active) });
    return { success: isPro, customerInfo: result.customerInfo };
  } catch (error: unknown) {
    const err = error as { userCancelled?: boolean; message?: string };
    if (err.userCancelled) {
      console.log('[revenuecat] Purchase cancelled by user');
      return { success: false, customerInfo: null, error: 'cancelled' };
    }
    console.log('[revenuecat] Purchase error:', err.message ?? error);
    return { success: false, customerInfo: null, error: err.message ?? 'Erreur inconnue' };
  }
}

export async function restorePurchases(): Promise<{ success: boolean; customerInfo: CustomerInfo | null; error?: string }> {
  try {
    console.log('[revenuecat] Restoring purchases...');
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    console.log('[revenuecat] Restore result:', { isPro, activeEntitlements: Object.keys(customerInfo.entitlements.active) });
    return { success: isPro, customerInfo };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.log('[revenuecat] Restore error:', err.message ?? error);
    return { success: false, customerInfo: null, error: err.message ?? 'Erreur inconnue' };
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('[revenuecat] Customer info:', {
      isPro: customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined,
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
    });
    return customerInfo;
  } catch (error) {
    console.log('[revenuecat] getCustomerInfo error:', error);
    return null;
  }
}

export function checkProAccess(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function loginRC(userId: string): Promise<void> {
  try {
    console.log('[revenuecat] Login:', userId);
    await Purchases.logIn(userId);
  } catch (error) {
    console.log('[revenuecat] Login error:', error);
  }
}

export async function logoutRC(): Promise<void> {
  try {
    console.log('[revenuecat] Logout');
    await Purchases.logOut();
  } catch (error) {
    console.log('[revenuecat] Logout error:', error);
  }
}

configureRevenueCat();
