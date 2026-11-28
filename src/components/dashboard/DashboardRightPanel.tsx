"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  IconBookOpen,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardList,
  IconEdit,
  IconLayers,
  IconZap,
} from "@/components/ui/Icons";
import {
  buildWeekCalendarDays,
  getCompanyMonogram,
  getUpcomingSubtests,
} from "@/lib/assessment/dashboard";
import { saveLocalProfile, useLocalProfile } from "@/lib/client/local-profile";
import { useLocalProgress } from "@/lib/client/local-progress";
import type { DashboardCompany, SubtestKind } from "@/types/assessment";

interface DashboardRightPanelProps {
  catalog: DashboardCompany[];
  initialNowIso: string;
}

function renderSubtestIcon(kind: SubtestKind) {
  switch (kind) {
    case "PAULI":
      return <IconZap className="h-4 w-4" />;
    case "PERSONALITY":
      return <IconLayers className="h-4 w-4" />;
    case "DRAWING":
      return <IconEdit className="h-4 w-4" />;
    case "QUIZ":
    default:
      return <IconClipboardList className="h-4 w-4" />;
  }
}

export function DashboardRightPanel({ catalog, initialNowIso }: DashboardRightPanelProps) {
  const profile = useLocalProfile();
  const progress = useLocalProgress();

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.displayName);
  const [draftRole, setDraftRole] = useState(profile.roleTitle);
  const [weekOffset, setWeekOffset] = useState(0);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const wasEditingRef = useRef(false);

  const referenceDate = useMemo(() => new Date(initialNowIso), [initialNowIso]);
  const calendar = useMemo(
    () => buildWeekCalendarDays(progress, referenceDate, weekOffset),
    [progress, referenceDate, weekOffset],
  );
  const upcoming = useMemo(() => getUpcomingSubtests(catalog, progress, 4), [catalog, progress]);
  const hasAnySubtests = useMemo(
    () =>
      catalog.some((company) =>
        company.packages.some((pkg) => pkg.subtests.some((subtest) => subtest.questionCount > 0)),
      ),
    [catalog],
  );
  const avatarMonogram = useMemo(
    () => getCompanyMonogram(profile.displayName),
    [profile.displayName],
  );

  useEffect(() => {
    const wasEditing = wasEditingRef.current;
    wasEditingRef.current = editing;

    if (!wasEditing && editing) {
      nameInputRef.current?.focus();
    } else if (wasEditing && !editing) {
      editButtonRef.current?.focus();
    }
  }, [editing]);

  function handleToggleEdit() {
    if (!editing) {
      setDraftName(profile.displayName);
      setDraftRole(profile.roleTitle);
      setEditing(true);
    } else {
      setEditing(false);
    }
  }

  function handleSubmitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveLocalProfile({
      displayName: draftName,
      roleTitle: draftRole,
    });
    setEditing(false);
  }

  function handleFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-between gap-6">
      <div className="space-y-6">
        {/* Blok 1: Profil Peserta Lokal (Ringkas & Horizontal) */}
        <section aria-labelledby="local-profile-heading">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-canvas/70 p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-extrabold tracking-tight text-brand-text"
              >
                {avatarMonogram}
              </div>
              <div className="min-w-0">
                <h2 id="local-profile-heading" className="truncate text-sm font-bold text-ink">
                  {profile.displayName}
                </h2>
                <p className="mt-0.5 truncate text-xs font-medium text-ink-muted">
                  {profile.roleTitle}
                </p>
              </div>
            </div>

            <button
              ref={editButtonRef}
              type="button"
              onClick={handleToggleEdit}
              aria-label="Edit profil lokal"
              aria-expanded={editing}
              className="inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-xl text-ink-secondary transition hover:bg-subtle hover:text-ink"
            >
              <IconEdit className="h-4 w-4" />
            </button>
          </div>

          {editing ? (
            <form
              onSubmit={handleSubmitProfile}
              onKeyDown={handleFormKeyDown}
              className="mt-2.5 rounded-2xl border border-line bg-surface p-3.5 space-y-2.5 text-left"
            >
              <div>
                <label
                  htmlFor="local-profile-name"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  Nama
                </label>
                <input
                  id="local-profile-name"
                  ref={nameInputRef}
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  maxLength={40}
                  placeholder="Peserta Mandiri"
                  className="mt-1 w-full rounded-xl border border-line-strong bg-canvas px-3 py-2 text-xs font-medium text-ink placeholder:text-ink-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-brand"
                />
              </div>
              <div>
                <label
                  htmlFor="local-profile-role"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  Target Posisi
                </label>
                <input
                  id="local-profile-role"
                  type="text"
                  value={draftRole}
                  onChange={(event) => setDraftRole(event.target.value)}
                  maxLength={50}
                  placeholder="Persiapan Seleksi Kerja"
                  className="mt-1 w-full rounded-xl border border-line-strong bg-canvas px-3 py-2 text-xs font-medium text-ink placeholder:text-ink-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-brand"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="inline-flex min-h-[36px] flex-1 items-center justify-center rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-hover"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex min-h-[36px] flex-1 items-center justify-center rounded-xl border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-subtle hover:text-ink"
                >
                  Batal
                </button>
              </div>
            </form>
          ) : null}
        </section>

        {/* Blok 2: Kalender Mingguan */}
        <section
          aria-label="Kalender Latihan"
          className="rounded-2xl border border-line bg-canvas/70 p-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              aria-label="Minggu sebelumnya"
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-ink-secondary transition hover:bg-subtle hover:text-ink"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-ink">{calendar.monthLabel}</span>
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              aria-label="Minggu berikutnya"
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-ink-secondary transition hover:bg-subtle hover:text-ink"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2.5 grid grid-cols-7 gap-1 text-center">
            {calendar.days.map((day) => (
              <div
                key={`weekday-${day.dateKey}`}
                className={`text-xs font-semibold ${
                  day.isToday ? "text-brand-text" : "text-ink-muted"
                }`}
              >
                <span aria-hidden="true">{day.weekdayShort.charAt(0)}</span>
                <span className="sr-only">{day.weekdayShort}</span>
              </div>
            ))}

            {calendar.days.map((day) => {
              const summaryLabel = `${day.weekdayShort}, ${day.dateKey}${
                day.isToday ? " (Hari ini)" : ""
              }${day.hasActivity ? " — ada aktivitas latihan" : ""}`;
              return (
                <div
                  key={day.dateKey}
                  title={summaryLabel}
                  className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-xs tabular-nums ${
                    day.isToday
                      ? "border border-brand/30 bg-brand-soft font-bold text-brand-text"
                      : "font-semibold text-ink-secondary"
                  }`}
                >
                  <span aria-hidden="true">{day.dayNumber}</span>
                  <span className="sr-only">{summaryLabel}</span>
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      day.hasActivity ? "bg-emerald-500" : "bg-transparent"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Blok 3: Latihan Berikutnya */}
        <section aria-labelledby="upcoming-subtests-heading">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 id="upcoming-subtests-heading" className="text-sm font-bold text-ink">
              Latihan Berikutnya
            </h3>
            <Link
              href="/riwayat"
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-text transition hover:underline"
            >
              <span>Lihat semua</span>
              <IconChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {upcoming.length > 0 ? (
            <ul className="space-y-2">
              {upcoming.map((item) => (
                <li key={item.subtestId}>
                  <Link
                    href={`/test/${item.subtestId}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-2.5 transition hover:border-line-strong hover:bg-canvas"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-secondary transition group-hover:bg-brand-soft group-hover:text-brand-text"
                      >
                        {renderSubtestIcon(item.kind)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-ink group-hover:text-brand-text">
                          {item.subtestName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-muted tabular-nums">
                          {item.companyName} · {item.durationMinutes} mnt
                        </p>
                      </div>
                    </div>
                    <IconChevronRight className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-line bg-canvas/70 p-4 text-center">
              <IconCheckCircle className="mx-auto h-6 w-6 text-emerald-600 dark:text-emerald-300" />
              <p className="mt-2 text-xs font-bold text-ink">
                {hasAnySubtests
                  ? "Semua subtes sudah tuntas!"
                  : "Belum ada subtes yang tersedia."}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {hasAnySubtests
                  ? "Kerja bagus. Kamu bisa meninjau pembahasan atau mengulang latihan dari riwayat."
                  : "Tambahkan paket soal di CMS Admin atau cek riwayat latihanmu."}
              </p>
              <Link
                href="/riwayat"
                className="mt-3 inline-flex min-h-[36px] items-center justify-center rounded-xl border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-subtle"
              >
                Buka Riwayat
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Blok 4: Kartu Materi Inggris */}
      <section
        aria-label="Materi Bahasa Inggris"
        className="rounded-2xl border border-line bg-canvas/70 p-4"
      >
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text"
          >
            <IconBookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-ink">Kamus &amp; Kuis Bahasa Inggris</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
              1.000 kosakata inti (CEFR A1–C1) untuk persiapan seleksi kerja.
            </p>
          </div>
        </div>
        <Link
          href="/materi"
          className="mt-3 inline-flex min-h-[36px] w-full items-center justify-center rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
        >
          Buka Materi Inggris
        </Link>
      </section>
    </div>
  );
}
