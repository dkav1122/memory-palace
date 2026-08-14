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
  const { assignments, hydrated, storageError, hydrate, setAssignment, removeAssignment } =
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
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

      {storageError && (
        <div className="mb-6 rounded-xl border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Could not load saved photos: {storageError}. You can still assign new
          cards, but they may not persist in this browser.
        </div>
      )}

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
                  onClick={() => setEditing(card.id)}
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

      {editing && (
        <CardEditor
          cardId={editing}
          existingName={assignments[editing]?.name ?? ""}
          existingUrl={assignments[editing]?.url}
          onSave={async (name, image) => {
            if (image) {
              const blob = await processPhoto(image);
              await setAssignment(editing, name, blob);
            } else if (assignments[editing]) {
              // rename only: re-store the existing blob with the new name
              const res = await fetch(assignments[editing].url);
              await setAssignment(editing, name, await res.blob());
            }
            setEditing(null);
          }}
          onRemove={
            assignments[editing]
              ? async () => {
                  await removeAssignment(editing);
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

const UPLOADABLE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
]);

function uploadTypeError(file: File): string | null {
  if (UPLOADABLE_TYPES.has(file.type)) return null;
  if (/\.heic$|\.heif$/i.test(file.name)) {
    return "HEIC/HEIF photos are not supported. Export as JPEG or PNG first.";
  }
  return `Unsupported image type (${file.type || "unknown"}). Use JPEG, PNG, or WebP.`;
}

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
  const [saveError, setSaveError] = useState<string | null>(null);
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
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
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
          accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) {
              setImageBlob(null);
              setSaveError(null);
              return;
            }
            const typeErr = uploadTypeError(file);
            if (typeErr) {
              setSaveError(typeErr);
              setImageBlob(null);
              e.target.value = "";
              return;
            }
            setSaveError(null);
            setImageBlob(file);
          }}
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

        {saveError && (
          <p className="mb-3 text-xs text-red-400">{saveError}</p>
        )}

        <div className="flex gap-2">
          <button
            disabled={!canSave || saving}
            onClick={async () => {
              setSaving(true);
              setSaveError(null);
              try {
                await onSave(name.trim(), image);
              } catch (err) {
                setSaveError(err instanceof Error ? err.message : String(err));
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
              className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
