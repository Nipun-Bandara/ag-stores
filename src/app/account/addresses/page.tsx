import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { AccountHeader } from "@/features/account/components/account-header";
import { AddressManager } from "@/features/account/components/address-manager";
import { requireRole } from "@/lib/auth/server";
import { listCustomerAddresses } from "@/services/customer-address.service";

export const metadata: Metadata = { title: "Delivery addresses | AG Stores" };

export default async function AddressesPage() {
  const user = await requireRole(UserRole.CUSTOMER, "/account/addresses");
  const addresses = await listCustomerAddresses(user);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <AccountHeader user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Delivery addresses
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Save delivery locations and choose the default used at checkout.
        </p>
        <AddressManager initialAddresses={addresses} />
      </section>
    </main>
  );
}
