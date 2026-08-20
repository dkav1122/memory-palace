"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  cardFullName,
  DECK,
  getCard,
  isRedSuit,
  SUIT_NAME,
  SUIT_SYMBOL,
  SUITS,
} from "@/lib/cards";
import { generateCardImage } from "@/lib/generateImage";
import { processPhoto } from "@/lib/storage";
import { useGameStore } from "@/store/gameStore";

export function DeckSetup() {
  const { assignments, hydrated, hydrate, setAssignment, removeAssignment } =
    useGameStore();
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const assignedCount = Object.keys(assignments).length;

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-32 text-zinc-500">
        Loading your deck…
      </div>
    );
  }

  // Capture the card being edited so async save/remove cannot write to a
  // different id if `editing` changes while a photo is still processing.
  const editingId = editing;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div inert={editingId ? true : undefined} aria-hidden={editingId ? true : undefined}>
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
              ← Home
            </Link>
            <h1 className="mt-1 text-3xl font-bold">Your deck</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Assign a photo and a name to each card. Pick images with strong
              personal meaning — people, pets, places. The weirder and more vivid
              the association, the better it sticks.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-center">
              <div className="text-2xl font-bold">{assignedCount} / 52</div>
              <div className="text-xs text-zinc-500">cards assigned</div>
              <div className="mt-1 text-xs text-zinc-500">
                {assignedCount >= 10
                  ? "Ready to play"
                  : `${10 - assignedCount} more to play`}
              </div>
            </div>
            <Link
              href="/deck/import"
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Import from folder →
            </Link>
          </div>
        </div>

        {SUITS.map((suit) => (
          <section key={suit} className="mb-8">
            <h2
              className={`mb-3 text-lg font-semibold ${
                isRedSuit(suit) ? "text-red-400" : "text-zinc-300"
              }`}
            >
              {SUIT_SYMBOL[suit]} {SUIT_NAME[suit]}
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 md:grid-cols-13">
              {DECK.filter((c) => c.suit === suit).map((card) => {
                const assignment = assignments[card.id];
                return (
                  <button
                    key={card.id}
                    onClick={() =>
                      // Ignore switches while the editor is open so a stray
                      // activation cannot rebind an in-progress photo/name.
                      setEditing((current) => current ?? card.id)
                    }
                    className={`group relative aspect-[3/4] overflow-hidden rounded-lg border text-left transition ${
                      assignment
                        ? "border-emerald-700/60 bg-zinc-900"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                    }`}
                    title={cardFullName(card.id)}
                  >
                    {assignment ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={assignment.url}
                          alt={assignment.name}
                          className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:opacity-100"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 text-[10px] leading-tight text-zinc-200 truncate">
                          {assignment.name}
                        </span>
                      </>
                    ) : null}
                    <span
                      className={`absolute top-0.5 left-1 text-sm font-bold ${
                        assignment
                          ? "text-white drop-shadow"
                          : isRedSuit(suit)
                            ? "text-red-400/70"
                            : "text-zinc-500"
                      }`}
                    >
                      {card.rank}
                      {SUIT_SYMBOL[suit]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {editingId && (
        <CardEditor
          key={editingId}
          cardId={editingId}
          existingName={assignments[editingId]?.name ?? ""}
          existingUrl={assignments[editingId]?.url}
          onSave={async (name, image) => {
            if (image) {
              const blob = await processPhoto(image);
              await setAssignment(editingId, name, blob);
            } else if (assignments[editingId]) {
              // rename only: re-store the existing blob with the new name
              const res = await fetch(assignments[editingId].url);
              await setAssignment(editingId, name, await res.blob());
            }
            setEditing(null);
          }}
          onRemove={
            assignments[editingId]
              ? async () => {
                  await removeAssignment(editingId);
                  setEditing(null);
                }
              : undefined
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

type ImageSource = "upload" | "generate";

function CardEditor({
  cardId,
  existingName,
  existingUrl,
  onSave,
  onRemove,
  onClose,
}: {
  cardId: string;
  existingName: string;
  existingUrl?: string;
  onSave: (name: string, image: Blob | null) => Promise<void>;
  onRemove?: () => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(existingName);
  const [source, setSource] = useState<ImageSource>("upload");
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setImageBlob = (blob: Blob | null) => {
    setImage(blob);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return blob ? URL.createObjectURL(blob) : null;
    });
  };

  const handleGenerate = async () => {
    if (!description.trim() || generating) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      setImageBlob(await generateCardImage(description.trim(), cardId));
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const card = getCard(cardId);
  const shownImage = preview ?? existingUrl;
  const canSave = name.trim().length > 0 && (image !== null || !!existingUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 p-4"
      onClick={saving ? undefined : onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center gap-3">
          <span
            className={`text-3xl font-bold ${
              isRedSuit(card.suit) ? "text-red-500" : "text-zinc-100"
            }`}
          >
            {card.rank}
            {SUIT_SYMBOL[card.suit]}
          </span>
          <div>
            <div className="font-semibold">{cardFullName(cardId)}</div>
            <div className="text-xs text-zinc-500">
              Choose an image you&apos;ll never forget
            </div>
          </div>
        </div>

        <div className="mb-3 flex rounded-lg border border-zinc-800 p-0.5 text-xs">
          {(
            [
              ["upload", "Upload a photo"],
              ["generate", "Describe it"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setSource(mode)}
              className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
                source === mode
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => source === "upload" && fileInputRef.current?.click()}
          className={`mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 ${
            source === "upload" ? "hover:border-zinc-500" : "cursor-default"
          }`}
        >
          {generating ? (
            <span className="animate-pulse text-sm text-zinc-500">
              Generating image…
            </span>
          ) : shownImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownImage}
              alt="preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-4 text-center text-sm text-zinc-500">
              {source === "upload"
                ? "Click to choose a photo"
                : "Describe the image below and generate it"}
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setImageBlob(e.target.files?.[0] ?? null)}
        />

        {source === "generate" && (
          <div className="mb-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Michael Jordan mid-dunk, tongue out, red jersey"
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
            <button
              onClick={handleGenerate}
              disabled={!description.trim() || generating}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-40"
            >
              {generating
                ? "Generating…"
                : image
                  ? "Regenerate"
                  : "Generate image"}
            </button>
            {generateError && (
              <p className="mt-1.5 text-xs text-red-400">{generateError}</p>
            )}
          </div>
        )}

        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mom, Michael Jordan…"
          className="mb-5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          autoFocus
        />

        <div className="flex gap-2">
          <button
            disabled={!canSave || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(name.trim(), image);
              } finally {
                setSaving(false);
              }
            }}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              disabled={saving}
              className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-40"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
