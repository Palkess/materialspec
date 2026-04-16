import { UNITS } from "@materialspec/shared";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

export default function UnitSelect({ value, onChange, className = "", id }: Props) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 bg-concrete-800 border border-concrete-600 rounded text-white focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors ${className}`}
    >
      {UNITS.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
}
