"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setErrorMessage(data.error ?? "Gagal masuk");
        return;
      }
      router.refresh();
    } catch {
      setErrorMessage("Tidak bisa menghubungi server");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-16 w-full max-w-sm rounded-xl border border-slate-300 p-6 dark:border-slate-600">
      <h1 className="text-xl font-bold">Masuk Admin</h1>
      <label htmlFor="admin-password" className="mt-4 block text-sm font-medium">
        Password
      </label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={function onChange(event) {
          setPassword(event.target.value);
        }}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600"
        required
      />
      {errorMessage ? <p role="alert" className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}
