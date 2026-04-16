import { VAT_RATES } from "@materialspec/shared";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

export default function VatSelect({ value, onChange, className = "", id }: Props) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 bg-concrete-800 border border-concrete-600 rounded text-white focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors ${className}`}
    >
      {VAT_RATES.map((rate) => (
        <option key={rate} value={rate.toString()}>
          {(rate * 100).toFixed(0)} %
        </option>
      ))}
    </select>
  );
}
