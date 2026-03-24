import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage
} from "react-native-purchases";

import { getRevenueCatAndroidApiKey, getRevenueCatIosApiKey } from "../app/env";

export const BILLING_PRODUCT_ID = "athlyt_premium_monthly";
export const PREMIUM_ENTITLEMENT_ID = "premium";

function getRevenueCatApiKey(): string {
  if (Platform.OS === "android") {
    return getRevenueCatAndroidApiKey();
  }

  if (Platform.OS === "ios") {
    return getRevenueCatIosApiKey();
  }

  throw new Error("RevenueCat is only supported on iOS and Android builds.");
}

class BillingService {
  private initialized = false;
  private currentUserId: string | null = null;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    Purchases.configure({ apiKey: getRevenueCatApiKey() });
    this.initialized = true;
  }

  async login(userId: string): Promise<void> {
    this.initialize();

    if (this.currentUserId === userId) {
      return;
    }

    await Purchases.logIn(userId);
    this.currentUserId = userId;
  }

  async logout(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await Purchases.logOut();
    this.currentUserId = null;
  }

  async getOfferings(): Promise<PurchasesOfferings | null> {
    this.initialize();
    return Purchases.getOfferings();
  }

  async purchasePackage(aPackage: PurchasesPackage): Promise<CustomerInfo> {
    this.initialize();
    const result = await Purchases.purchasePackage(aPackage);
    return result.customerInfo;
  }

  async restorePurchases(): Promise<CustomerInfo> {
    this.initialize();
    return Purchases.restorePurchases();
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    this.initialize();
    return Purchases.getCustomerInfo();
  }
}

export function hasPremiumEntitlement(customerInfo: CustomerInfo | null | undefined): boolean {
  return Boolean(customerInfo?.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

export function getPrimaryPackage(
  offerings: PurchasesOfferings | null | undefined
): PurchasesPackage | null {
  return offerings?.current?.availablePackages[0] ?? null;
}

export const billingService = new BillingService();
