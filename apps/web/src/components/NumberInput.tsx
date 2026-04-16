import { useState, useRef, useCallback } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  lang: "sv" | "en";
  decimals?: number;
  className?: string;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

function parseLocaleNumber(raw: string, lang: "sv" | "en"): number | null {
  let cleaned = raw.trim();
  if (!cleaned) return null;

  if (lang === "sv") {
    // Swedish: comma is decimal separator, dot is ignored (thousands)
    cleaned = cleaned.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  } else {
    // English: dot is decimal separator, comma is ignored (thousands)
    cleaned = cleaned.replace(/\s/g, "").replace(/,/g, "");
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function formatForDisplay(
  value: string,
  lang: "sv" | "en",
  decimals: number
): string {
  if (!value) return "";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  const formatted = num.toFixed(decimals);
  if (lang === "sv") {
    return formatted.replace(".", ",");
  }
  return formatted;
}

export default function NumberInput({
  value,
  onChange,
  lang,
  decimals = 2,
  className = "",
  id,
  onKeyDown,
  inputRef,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const internalRef = useRef<HTMLInputElement>(null);

  const handleFocus = useCallback(() => {
    setFocused(true);
    // Show the current canonical value in locale format for editing
    setRawInput(formatForDisplay(value, lang, decimals));
  }, [value, lang, decimals]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = parseLocaleNumber(rawInput, lang);
    if (parsed !== null) {
      onChange(parsed.toString());
    } else if (rawInput.trim() === "") {
      onChange("0");
    }
  }, [rawInput, lang, onChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRawInput(e.target.value);
    },
    []
  );

  const displayValue = focused
    ? rawInput
    : formatForDisplay(value, lang, decimals);

  return (
    <input
      ref={inputRef || internalRef}
      id={id}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      className={`px-3 py-2 bg-concrete-800 border border-concrete-600 rounded text-white text-right font-mono focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors ${className}`}
    />
  );
}
