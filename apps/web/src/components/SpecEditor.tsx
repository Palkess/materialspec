import { useState, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { I18nextProvider, useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { z } from "zod";
import { UNITS, VAT_RATES } from "@materialspec/shared";
import { trpc } from "../lib/trpc";
import { createI18n } from "../lib/i18n";
import { useAuthGuard } from "../lib/useAuthGuard";
import SpecHeader from "./SpecHeader";
import ItemRow from "./ItemRow";
import TotalsFooter from "./TotalsFooter";

// Form schema allows empty item names — they are filtered out before save.
// The API schemas enforce min(1) on item names after filtering.
const specFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(2000).default(""),
  responsiblePerson: z.string().max(255).default(""),
  items: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().max(255).default(""),
      description: z.string().max(1000).default(""),
      unit: z.enum(UNITS).default("pcs"),
      quantity: z.string().default("0"),
      pricePerUnit: z.string().default("0"),
      // No refine here — Postgres returns "0.2500" etc. with trailing zeros.
      // Normalization happens in onSave before sending to the API.
      taxRate: z.string().default("0.25"),
    })
  ).default([]),
});

export interface SpecFormValues {
  name: string;
  description: string;
  responsiblePerson: string;
  items: Array<{
    id?: string;
    name: string;
    description: string;
    unit: string;
    quantity: string;
    pricePerUnit: string;
    taxRate: string;
  }>;
}

interface Props {
  lang: "sv" | "en";
  specId?: string;
  userName?: string;
}

const emptyItem = () => ({
  name: "",
  description: "",
  unit: "pcs",
  quantity: "0",
  pricePerUnit: "0",
  taxRate: "0.25",
});

function getApiUrl(): string {
  return (
    (typeof window !== "undefined" &&
      (window as unknown as { __API_URL__?: string }).__API_URL__) ||
    "http://localhost:3002"
  );
}

function SpecEditorInner({ lang, specId, userName }: Props) {
  const { t } = useTranslation("specs");
  const { t: tCommon } = useTranslation("common");
  const { user: authUser, checking } = useAuthGuard(lang);
  const apiUrl = getApiUrl();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedId, setSavedId] = useState(specId);

  const nameRefs = useRef<Map<number, HTMLInputElement | null>>(new Map());
  const priceRefs = useRef<Map<number, HTMLInputElement | null>>(new Map());

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<SpecFormValues>({
    resolver: zodResolver(specFormSchema),
    defaultValues: {
      name: "",
      description: "",
      responsiblePerson: userName || "",
      items: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "items",
    shouldUnregister: true,
  });

  const watchedItems = useWatch({ control, name: "items" }) || [];

  // Pre-fill responsible person from authenticated user
  useEffect(() => {
    if (!userName && authUser && !specId) {
      setValue("responsiblePerson", authUser.name);
    }
  }, [userName, authUser, specId, setValue]);

  // Load existing spec
  useEffect(() => {
    if (specId) {
      trpc.specs.get.query({ id: specId }).then((data) => {
        reset({
          name: data.name,
          description: data.description,
          responsiblePerson: data.responsiblePerson,
          items: data.items.map((item) => ({
            name: item.name,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity.replace(/\.?0+$/, "") || "0",
            pricePerUnit: item.pricePerUnit.replace(/\.?0+$/, "") || "0",
            taxRate: parseFloat(item.taxRate).toString(),
          })),
        });
      }).catch(() => {
        window.location.href = `/${lang}/specs`;
      });
    }
  }, [specId, reset, lang]);

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // In-app navigation guard — intercept clicks on <a> tags outside this form
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      // Allow export links (they open downloads, don't navigate away)
      if (href.includes("/export.")) return;
      e.preventDefault();
      if (window.confirm(tCommon("unsavedChangesConfirm"))) {
        window.location.href = href;
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty, tCommon]);

  const handleAppendRow = useCallback(() => {
    const newIndex = fields.length;
    append(emptyItem());
    // Focus new row's name input after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = nameRefs.current.get(newIndex);
        if (el) el.focus();
      });
    });
  }, [append, fields.length]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex((f) => f.id === active.id);
        const newIndex = fields.findIndex((f) => f.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          move(oldIndex, newIndex);
        }
      }
    },
    [fields, move]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onSave = async (data: SpecFormValues) => {
    setSaving(true);
    setSaveError("");
    try {
      // Filter empty trailing rows and normalize numeric strings from Postgres.
      // Postgres numeric(x,y) returns trailing zeros (e.g. "0.2500", "5.000")
      // which fail the API's VAT_RATES.map(String) check and regex patterns.
      // fields.length is the authoritative count of visible rows. data.items may
      // be longer because react-hook-form's shouldUnregister:false preserves
      // unregistered field values on unmount, re-extending the array after
      // useFieldArray.remove() shrinks it. Slicing to fields.length drops those
      // phantom entries before filtering and sending to the API.
      const filteredItems = data.items
        .slice(0, fields.length)
        .filter((item) => item.name.trim() !== "")
        .map((item) => ({
          ...item,
          quantity: item.quantity.replace(/\.?0+$/, "") || "0",
          pricePerUnit: item.pricePerUnit.replace(/\.?0+$/, "") || "0",
          taxRate: parseFloat(item.taxRate).toString(),
        }));

      if (savedId) {
        await trpc.specs.update.mutate({
          id: savedId,
          name: data.name,
          description: data.description,
          responsiblePerson: data.responsiblePerson,
          items: filteredItems,
        });
      } else {
        const result = await trpc.specs.create.mutate({
          name: data.name,
          description: data.description,
          responsiblePerson: data.responsiblePerson,
          items: filteredItems,
        });
        setSavedId(result.id);
        window.history.replaceState(null, "", `/${lang}/specs/${result.id}/edit`);
      }
      // Remove empty rows synchronously before reset() iterates registered inputs.
      // Without flushSync, the empty row's ItemRow is still mounted when reset()
      // runs, so RHF calls set(_formValues, 'items.N.name', undefined) for those
      // inputs — extending the array with a phantom {} that keeps isDirty true.
      // flushSync forces the removal render (and, with shouldUnregister:true, the
      // unregistration) to complete before reset() sees any registered fields.
      const emptyIndices = data.items
        .slice(0, fields.length)
        .reduce<number[]>((acc, item, i) => {
          if (item.name.trim() === "") acc.push(i);
          return acc;
        }, []);
      if (emptyIndices.length > 0) {
        flushSync(() => remove(emptyIndices));
      }
      reset({ ...data, items: filteredItems });
    } catch (err) {
      console.error("Save failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(msg || "Save failed — check console for details");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return <div className="text-neutral-400 text-center py-12">{tCommon("loading")}</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {saveError && (
        <div className="mb-4 bg-red-900/50 border-l-4 border-red-500 text-red-200 px-4 py-3 rounded font-bold text-sm">
          {saveError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href={`/${lang}/specs`}
              className="min-h-btn inline-flex items-center px-4 py-2 bg-concrete-900 border border-concrete-800 rounded text-neutral-300 hover:text-white hover:bg-concrete-800 transition-colors font-bold text-sm uppercase tracking-wide"
            >
              &larr; {tCommon("back")}
            </a>
            {isDirty && (
              <span className="inline-flex items-center gap-2 text-safety-500 text-sm font-bold">
                <span className="w-2 h-2 rounded-full bg-safety-500 animate-pulse" />
                {tCommon("unsavedChanges")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {savedId && (
              <>
                <a
                  href={`${apiUrl}/specs/${savedId}/export.xlsx?lang=${lang}`}
                  className="min-h-btn inline-flex items-center px-4 py-2 bg-concrete-800 border border-concrete-700 hover:bg-concrete-700 text-neutral-200 rounded font-bold text-sm uppercase tracking-wide transition-colors"
                >
                  {t("editor.exportXlsx")}
                </a>
                <a
                  href={`${apiUrl}/specs/${savedId}/export.pdf?lang=${lang}`}
                  className="min-h-btn inline-flex items-center px-4 py-2 bg-concrete-800 border border-concrete-700 hover:bg-concrete-700 text-neutral-200 rounded font-bold text-sm uppercase tracking-wide transition-colors"
                >
                  {t("editor.exportPdf")}
                </a>
              </>
            )}
            <button
              type="submit"
              disabled={saving}
              className="min-h-btn bg-safety-500 hover:bg-safety-400 text-concrete-950 font-bold py-3 px-8 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide text-sm"
            >
              {saving ? "..." : tCommon("save")}
            </button>
          </div>
        </div>

        <SpecHeader register={register} errors={errors} />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="bg-concrete-900 border border-concrete-800 rounded-lg overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-concrete-700">
                <th className="px-2 py-3 w-8"></th>
                <th className="px-1 py-3 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {t("editor.item.name")}
                </th>
                <th className="px-1 py-3 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                  {t("editor.item.description")}
                </th>
                <th className="px-1 py-3 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {t("editor.item.vatRate")}
                </th>
                <th className="px-1 py-3 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {t("editor.item.unit")}
                </th>
                <th className="px-1 py-3 text-right text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {t("editor.item.quantity")}
                </th>
                <th className="px-1 py-3 text-right text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {t("editor.item.pricePerUnit")}
                </th>
                <th className="px-2 py-3 text-right text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {t("editor.item.tax")}
                </th>
                <th className="px-2 py-3 text-right text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {t("editor.item.total")}
                </th>
                <th className="px-2 py-3 w-8"></th>
              </tr>
            </thead>
            <SortableContext
              items={fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {fields.map((field, index) => (
                  <ItemRow
                    key={field.id}
                    id={field.id}
                    index={index}
                    isLast={index === fields.length - 1}
                    register={register}
                    control={control}
                    onRemove={() => remove(index)}
                    onAppendRow={handleAppendRow}
                    setValue={(name, value) =>
                      setValue(name as `items.${number}.${string}`, value, {
                        shouldDirty: true,
                      })
                    }
                    lang={lang}
                    nameInputRef={(el) => nameRefs.current.set(index, el)}
                    priceInputRef={(el) => priceRefs.current.set(index, el)}
                    nextRowNameRef={
                      index < fields.length - 1
                        ? () => nameRefs.current.get(index + 1) || null
                        : null
                    }
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>

          <div className="px-4 py-3 border-t border-concrete-800">
            <button
              type="button"
              onClick={handleAppendRow}
              className="inline-flex items-center gap-1 text-sm text-safety-500 hover:text-safety-400 font-bold uppercase tracking-wide transition-colors py-2"
            >
              + {t("editor.addRow")}
            </button>
          </div>
          </div>
        </DndContext>

        <TotalsFooter items={watchedItems || []} lang={lang} />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="min-h-btn bg-safety-500 hover:bg-safety-400 text-concrete-950 font-bold py-3 px-8 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide text-sm"
          >
            {saving ? "..." : tCommon("save")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SpecEditor({ lang, specId, userName }: Props) {
  const i18n = createI18n(lang);
  return (
    <I18nextProvider i18n={i18n}>
      <SpecEditorInner lang={lang} specId={specId} userName={userName} />
    </I18nextProvider>
  );
}
