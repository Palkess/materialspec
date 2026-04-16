import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import type { UseFormRegister, Control } from "react-hook-form";
import { useWatch } from "react-hook-form";
import NumberInput from "./NumberInput";
import VatSelect from "./VatSelect";
import UnitSelect from "./UnitSelect";
import { lineTotal, roundForDisplay } from "@materialspec/shared";
import type { SpecFormValues } from "./SpecEditor";

interface Props {
  index: number;
  isLast: boolean;
  id: string;
  register: UseFormRegister<SpecFormValues>;
  control: Control<SpecFormValues>;
  onRemove: () => void;
  onAppendRow: () => void;
  setValue: (name: `items.${number}.${string}`, value: string) => void;
  lang: "sv" | "en";
  nameInputRef: (el: HTMLInputElement | null) => void;
  priceInputRef: (el: HTMLInputElement | null) => void;
  nextRowNameRef: (() => HTMLInputElement | null) | null;
}

export default function ItemRow({
  index,
  isLast,
  id,
  register,
  control,
  onRemove,
  onAppendRow,
  setValue,
  lang,
  nameInputRef,
  priceInputRef,
  nextRowNameRef,
}: Props) {
  const { t } = useTranslation("specs");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const quantity = useWatch({ control, name: `items.${index}.quantity` }) || "0";
  const pricePerUnit = useWatch({ control, name: `items.${index}.pricePerUnit` }) || "0";
  const taxRate = useWatch({ control, name: `items.${index}.taxRate` }) || "0.25";

  const derived = useMemo(() => {
    return lineTotal({ quantity, pricePerUnit, taxRate });
  }, [quantity, pricePerUnit, taxRate]);

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && !e.shiftKey && isLast) {
      e.preventDefault();
      onAppendRow();
    }
  };

  const formatMoney = (val: string) => {
    if (lang === "sv") return val.replace(".", ",");
    return val;
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-concrete-800 group transition-colors ${
        index % 2 === 1 ? "bg-concrete-800/30" : ""
      }`}
    >
      <td className="px-2 py-2.5 w-10 text-center">
        <button
          type="button"
          className="cursor-grab text-neutral-600 hover:text-neutral-300 active:cursor-grabbing p-1"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>
        </button>
      </td>
      <td className="px-1 py-2.5">
        <input
          type="text"
          {...register(`items.${index}.name`)}
          ref={(el) => {
            register(`items.${index}.name`).ref(el);
            nameInputRef(el);
          }}
          placeholder={t("editor.item.name")}
          className="w-full px-2 py-2 bg-concrete-800 border border-concrete-600 rounded text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
        />
      </td>
      <td className="px-1 py-2.5 hidden lg:table-cell">
        <input
          type="text"
          {...register(`items.${index}.description`)}
          placeholder={t("editor.item.description")}
          className="w-full px-2 py-2 bg-concrete-800 border border-concrete-600 rounded text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
        />
      </td>
      <td className="px-1 py-2.5">
        <VatSelect
          value={taxRate}
          onChange={(v) => setValue(`items.${index}.taxRate`, v)}
          className="w-full text-sm"
        />
      </td>
      <td className="px-1 py-2.5">
        <UnitSelect
          value={useWatch({ control, name: `items.${index}.unit` }) || "pcs"}
          onChange={(v) => setValue(`items.${index}.unit`, v)}
          className="w-full text-sm"
        />
      </td>
      <td className="px-1 py-2.5">
        <NumberInput
          value={quantity}
          onChange={(v) => setValue(`items.${index}.quantity`, v)}
          lang={lang}
          decimals={3}
          className="w-full text-sm"
        />
      </td>
      <td className="px-1 py-2.5">
        <NumberInput
          value={pricePerUnit}
          onChange={(v) => setValue(`items.${index}.pricePerUnit`, v)}
          lang={lang}
          decimals={2}
          className="w-full text-sm"
          onKeyDown={handlePriceKeyDown}
          inputRef={(el) => priceInputRef(el)}
        />
      </td>
      <td className="px-2 py-2.5 text-right text-neutral-400 text-sm font-mono whitespace-nowrap">
        {formatMoney(roundForDisplay(derived.tax))}
      </td>
      <td className="px-2 py-2.5 text-right text-white text-sm font-mono font-bold whitespace-nowrap">
        {formatMoney(roundForDisplay(derived.gross))}
      </td>
      <td className="px-2 py-2.5 w-10 text-center">
        <button
          type="button"
          onClick={onRemove}
          className="text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
          title={t("editor.deleteRow")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  );
}
