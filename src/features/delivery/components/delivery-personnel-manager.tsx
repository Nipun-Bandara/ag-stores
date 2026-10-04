"use client";

import { useState, type FormEvent } from "react";

import {
  FormError,
  FormField,
  SelectField,
} from "@/features/auth/components/form-fields";
import type {
  DeliveryPersonnelManagementView,
  DeliveryPersonnelView,
} from "@/services/delivery-personnel.service";

interface ApiPayload {
  data?:
    | DeliveryPersonnelView
    | {
        personnel: DeliveryPersonnelView;
        temporaryPassword: string;
      };
  error?: { message?: string };
}

async function readPayload(response: Response): Promise<ApiPayload> {
  return (await response.json().catch(() => ({}))) as ApiPayload;
}

function PersonnelForm({
  shops,
  person,
  onSaved,
  onCancel,
  onTemporaryPassword,
}: {
  shops: DeliveryPersonnelManagementView["shops"];
  person?: DeliveryPersonnelView;
  onSaved: (person: DeliveryPersonnelView) => void;
  onCancel?: () => void;
  onTemporaryPassword: (password: string) => void;
}) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const suffix = person?.id ?? "new";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(
      person
        ? `/api/delivery-personnel/${person.id}`
        : "/api/delivery-personnel",
      {
        method: person ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          assignedShopId: form.get("assignedShopId"),
          ...(!person ? { status: form.get("status") } : {}),
        }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      const payload = response ? await readPayload(response) : {};
      setError(payload.error?.message ?? "Unable to save delivery personnel.");
      setPending(false);
      return;
    }

    const payload = await readPayload(response);
    if (payload.data && "personnel" in payload.data) {
      onSaved(payload.data.personnel);
      onTemporaryPassword(payload.data.temporaryPassword);
      formElement.reset();
    } else if (payload.data) {
      onSaved(payload.data);
    }
    setPending(false);
  }

  return (
    <form className="space-y-4 rounded-xl border p-5" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold">
        {person ? `Edit ${person.name}` : "Create delivery account"}
      </h2>
      <FormField
        id={`delivery-name-${suffix}`}
        name="name"
        label="Name"
        defaultValue={person?.name ?? ""}
        maxLength={150}
        required
      />
      <FormField
        id={`delivery-email-${suffix}`}
        name="email"
        label="Email"
        type="email"
        defaultValue={person?.email ?? ""}
        maxLength={320}
        required
      />
      <FormField
        id={`delivery-phone-${suffix}`}
        name="phone"
        label="Phone"
        type="tel"
        defaultValue={person?.phone ?? ""}
        placeholder="+94771234567"
        required
      />
      <SelectField
        id={`delivery-shop-${suffix}`}
        name="assignedShopId"
        label="Assigned shop"
        defaultValue={person?.assignedShopId ?? shops[0]?.id}
        required
      >
        {shops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </SelectField>
      {!person ? (
        <SelectField
          id="delivery-status-new"
          name="status"
          label="Status"
          defaultValue="ACTIVE"
          required
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </SelectField>
      ) : null}
      {error ? <FormError>{error}</FormError> : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending || shops.length === 0}
          className="h-10 rounded-md bg-neutral-950 px-5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : person
              ? "Save delivery person"
              : "Create delivery account"}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="h-10 rounded-md border px-5 text-sm font-medium"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function DeliveryPersonnelManager({
  initialData,
}: {
  initialData: DeliveryPersonnelManagementView;
}) {
  const [personnel, setPersonnel] = useState(initialData.personnel);
  const [editingId, setEditingId] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState<string>();
  const [temporaryPassword, setTemporaryPassword] = useState<string>();
  const editingPerson = personnel.find(({ id }) => id === editingId);

  function savePerson(saved: DeliveryPersonnelView) {
    setPersonnel((current) => {
      const exists = current.some(({ id }) => id === saved.id);
      return exists
        ? current.map((person) => (person.id === saved.id ? saved : person))
        : [...current, saved];
    });
    setEditingId(undefined);
  }

  async function changeStatus(person: DeliveryPersonnelView) {
    setError(undefined);
    setPendingId(person.id);
    const status = person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const response = await fetch(
      `/api/delivery-personnel/${person.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      const payload = response ? await readPayload(response) : {};
      setError(payload.error?.message ?? "Unable to update account status.");
    } else {
      const payload = await readPayload(response);
      if (payload.data && !("personnel" in payload.data)) {
        savePerson(payload.data);
      }
    }
    setPendingId(undefined);
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div>
        {initialData.shops.length ? (
          <PersonnelForm
            key={editingPerson?.id ?? "new"}
            shops={initialData.shops}
            {...(editingPerson ? { person: editingPerson } : {})}
            {...(editingPerson
              ? { onCancel: () => setEditingId(undefined) }
              : {})}
            onSaved={savePerson}
            onTemporaryPassword={setTemporaryPassword}
          />
        ) : (
          <p className="rounded-xl border p-5 text-sm text-neutral-600">
            A shop is required before creating delivery accounts.
          </p>
        )}
        {temporaryPassword ? (
          <section
            className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4"
            aria-label="Temporary password"
          >
            <h3 className="font-semibold">Temporary password</h3>
            <p className="mt-1 text-sm text-amber-900">
              Share this securely. It is shown only for this creation response.
            </p>
            <code className="mt-3 block break-all rounded bg-white p-3 text-sm">
              {temporaryPassword}
            </code>
          </section>
        ) : null}
      </div>

      <section aria-labelledby="delivery-personnel-list-heading">
        <h2
          id="delivery-personnel-list-heading"
          className="text-lg font-semibold"
        >
          Delivery personnel
        </h2>
        {error ? (
          <div className="mt-4">
            <FormError>{error}</FormError>
          </div>
        ) : null}
        {personnel.length ? (
          <div className="mt-4 space-y-4">
            {personnel.map((person) => (
              <article
                key={person.id}
                data-testid="delivery-person-card"
                className="rounded-xl border p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{person.name}</h3>
                    <p className="mt-1 text-sm text-neutral-600">
                      {person.email} · {person.phone}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {person.assignedShopName ?? "Unassigned"}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium">
                    {person.status === "ACTIVE" ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
                  <button type="button" onClick={() => setEditingId(person.id)}>
                    Edit {person.name}
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === person.id}
                    onClick={() => changeStatus(person)}
                  >
                    {person.status === "ACTIVE" ? "Deactivate" : "Activate"}{" "}
                    {person.name}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-neutral-600">
            No delivery personnel have been assigned yet.
          </p>
        )}
      </section>
    </div>
  );
}
