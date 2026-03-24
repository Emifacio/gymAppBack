import { getApiErrorMessage, unwrapResult } from "@gym/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, sessionManager } from "../app/api-client";
import { useAuth } from "./use-auth";
import {
  billingService,
  getPrimaryPackage,
  hasPremiumEntitlement
} from "../services/billing.service";

interface BillingSyncResponse {
  entitlement_id: string;
  is_premium: boolean;
  product_id?: string | null;
  expires_at?: string | null;
  store?: string | null;
  source: "revenuecat";
}

interface BillingSnapshot {
  isPremium: boolean;
  offerings: Awaited<ReturnType<typeof billingService.getOfferings>>;
}

interface BillingClient {
  POST(path: "/billing/sync"): Promise<{
    data?: BillingSyncResponse;
    error?: unknown;
    response: Response;
  }>;
}

const BILLING_QUERY_KEY = "billing";

async function persistPremiumState(isPremium: boolean): Promise<void> {
  const session = await sessionManager.getSession();
  if (!session || session.member.is_premium === isPremium) {
    return;
  }

  await sessionManager.setSession({
    ...session,
    member: {
      ...session.member,
      is_premium: isPremium
    }
  });
}

async function syncPremiumWithBackend(): Promise<boolean> {
  const billingClient = apiClient as unknown as BillingClient;
  const result = await unwrapResult<BillingSyncResponse>(billingClient.POST("/billing/sync"));
  await persistPremiumState(result.is_premium);
  return result.is_premium;
}

async function loadBillingSnapshot(userId: string): Promise<BillingSnapshot> {
  await billingService.login(userId);

  const [offerings, customerInfo] = await Promise.all([
    billingService.getOfferings(),
    billingService.getCustomerInfo()
  ]);

  const sdkPremium = hasPremiumEntitlement(customerInfo);

  try {
    const backendPremium = await syncPremiumWithBackend();
    return {
      offerings,
      isPremium: sdkPremium || backendPremium
    };
  } catch {
    await persistPremiumState(sdkPremium);
    return {
      offerings,
      isPremium: sdkPremium
    };
  }
}

export function getBillingErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "userCancelled" in error) {
    return "Purchase cancelled.";
  }

  return getApiErrorMessage(error) || "We couldn't update your subscription right now.";
}

export function useBilling() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const memberId = session?.member.id;
  const isMember = session?.member.role === "member";
  const queryKey = [BILLING_QUERY_KEY, memberId];

  const billingQuery = useQuery({
    queryKey,
    enabled: Boolean(memberId) && isMember,
    staleTime: 60_000,
    queryFn: () => loadBillingSnapshot(memberId!)
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!memberId) {
        throw new Error("Please sign in before purchasing Premium.");
      }

      await billingService.login(memberId);
      const offerings = billingQuery.data?.offerings ?? (await billingService.getOfferings());
      const primaryPackage = getPrimaryPackage(offerings);

      if (!primaryPackage) {
        throw new Error("Premium is temporarily unavailable. Please try again in a moment.");
      }

      await billingService.purchasePackage(primaryPackage);
      return loadBillingSnapshot(memberId);
    },
    onSuccess: (snapshot) => {
      queryClient.setQueryData(queryKey, snapshot);
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!memberId) {
        throw new Error("Please sign in before restoring purchases.");
      }

      await billingService.login(memberId);
      await billingService.restorePurchases();
      return loadBillingSnapshot(memberId);
    },
    onSuccess: (snapshot) => {
      queryClient.setQueryData(queryKey, snapshot);
    }
  });

  return {
    isPremium: !session
      ? false
      : !isMember
        ? true
        : (billingQuery.data?.isPremium ?? session.member.is_premium),
    loading:
      billingQuery.isPending ||
      billingQuery.isFetching ||
      purchaseMutation.isPending ||
      restoreMutation.isPending,
    offerings: billingQuery.data?.offerings ?? null,
    purchase: async () => {
      await purchaseMutation.mutateAsync();
    },
    restore: async () => {
      await restoreMutation.mutateAsync();
    },
    refresh: async () => {
      if (!memberId || !isMember) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey });
      await billingQuery.refetch();
    }
  };
}
