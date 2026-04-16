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
    if (e.key === "Tab" && !e.shiftKey) {
      if (isLast) {
        e.preventDefault();
        onAppendRow();
      } else if (nextRowNameRef) {
        e.preventDefault();
        const el = nextRowNameRef();
        if (el) el.focus();
      }
    }
  };

  const formatMoney = (val: string) => {
    if (lang === "sv") return val.replace(".", ",");
    return val;
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-concrete-800 group">
      <td className="px-2 py-2 w-8">
        <button
          type="button"
          className="cursor-grab text-neutral-500 hover:text-neutral-300 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          &#x2630;
        </button>
      </td>
      <td className="px-1 py-2">
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
      <td className="px-1 py-2 hidden lg:table-cell">
        <input
          type="text"
          {...register(`items.${index}.description`)}
          placeholder={t("editor.item.description")}
          className="w-full px-2 py-2 bg-concrete-800 border border-concrete-600 rounded text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
        />
      </td>
      <td className="px-1 py-2">
        <VatSelect
          value={taxRate}
          onChange={(v) => setValue(`items.${index}.taxRate`, v)}
          className="w-full text-sm"
        />
      </td>
      <td className="px-1 py-2">
        <UnitSelect
          value={useWatch({ control, name: `items.${index}.unit` }) || "pcs"}
          onChange={(v) => setValue(`items.${index}.unit`, v)}
          className="w-full text-sm"
        />
      </td>
      <td className="px-1 py-2">
        <NumberInput
          value={quantity}
          onChange={(v) => setValue(`items.${index}.quantity`, v)}
          lang={lang}
          decimals={3}
          className="w-full text-sm"
        />
      </td>
      <td className="px-1 py-2">
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
      <td className="px-2 py-2 text-right text-neutral-400 text-sm font-mono whitespace-nowrap">
        {formatMoney(roundForDisplay(derived.tax))}
      </td>
      <td className="px-2 py-2 text-right text-white text-sm font-mono font-bold whitespace-nowrap">
        {formatMoney(roundForDisplay(derived.gross))}
      </td>
      <td className="px-2 py-2 w-8">
        <button
          type="button"
          onClick={onRemove}
          className="text-neutral-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title={t("editor.item.name")}
        >
          &#x1F5D1;
        </button>
      </td>
    </tr>
  );
}
