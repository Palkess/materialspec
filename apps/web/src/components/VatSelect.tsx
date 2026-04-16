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
      className={`pl-3 pr-8 py-2 bg-concrete-800 border border-concrete-600 rounded text-white focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors appearance-none cursor-pointer ${className}`}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23a3a3a3' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}

    >
      {VAT_RATES.map((rate) => (
        <option key={rate} value={rate.toString()}>
          {(rate * 100).toFixed(0)} %
        </option>
      ))}
    </select>
  );
}
