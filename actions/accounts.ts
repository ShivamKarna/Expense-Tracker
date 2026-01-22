"use server";
import { db } from "@/lib/prisma";
import { Account } from "@/types/account";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeDecimal = <T extends Record<string, unknown>>(obj: T): T => {
  const serialized = { ...obj };
  for (const key in serialized) {
    const value = serialized[key];
    if (value && typeof value === "object" && "toNumber" in value) {
      (serialized as Record<string, unknown>)[key] = (
        value as { toNumber: () => number }
      ).toNumber();
    }
  }
  return serialized;
};

const serializeAccount = (obj: Record<string, unknown>): Account => {
  return serializeDecimal(obj) as unknown as Account;
};

export async function updateDefaultAccount(accountId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not Found");
    }

    // First, set all accounts to not default
    await db.account.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });

    // Then set the selected account as default
    const account = await db.account.update({
      where: { id: accountId, userId: user.id },
      data: { isDefault: true },
    });

    revalidatePath("/dashboard");
    return { success: true, data: serializeAccount(account) };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: errorMessage };
  }
}

export async function getAccountWithTransactions(accountId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not Found");
  }
  const account = await db.account.findUnique({
    where: { id: accountId },
    include: {
      transactions: {
        orderBy: { date: "desc" },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!account || account.userId !== user.id) return null;

  const serializedAccount = serializeAccount(account);
  const serializedTransactions = account.transactions.map((t) =>
    serializeDecimal(t),
  );

  return {
    ...serializedAccount,
    transactions: serializedTransactions,
  };
}
