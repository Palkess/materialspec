import { useTranslation } from "react-i18next";
import type { UseFormRegister, FieldErrors } from "react-hook-form";

interface SpecFormValues {
  name: string;
  description: string;
  responsiblePerson: string;
  items: unknown[];
}

interface Props {
  register: UseFormRegister<SpecFormValues>;
  errors: FieldErrors<SpecFormValues>;
}

export default function SpecHeader({ register, errors }: Props) {
  const { t } = useTranslation("specs");

  return (
    <div className="bg-concrete-900 border border-concrete-800 rounded-lg p-6 space-y-4">
      <div>
        <label
          htmlFor="spec-name"
          className="block font-bold text-neutral-200 mb-2 uppercase text-sm tracking-wide"
        >
          {t("editor.name")}
        </label>
        <input
          id="spec-name"
          type="text"
          {...register("name")}
          placeholder={t("editor.namePlaceholder")}
          className="w-full px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors text-lg font-bold"
        />
        {errors.name && (
          <p className="text-red-400 text-sm mt-1 font-bold">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="spec-description"
          className="block font-bold text-neutral-200 mb-2 uppercase text-sm tracking-wide"
        >
          {t("editor.description")}
        </label>
        <textarea
          id="spec-description"
          {...register("description")}
          placeholder={t("editor.descriptionPlaceholder")}
          rows={2}
          className="w-full px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors resize-y"
        />
      </div>

      <div>
        <label
          htmlFor="spec-responsible"
          className="block font-bold text-neutral-200 mb-2 uppercase text-sm tracking-wide"
        >
          {t("editor.responsiblePerson")}
        </label>
        <input
          id="spec-responsible"
          type="text"
          {...register("responsiblePerson")}
          placeholder={t("editor.responsiblePersonPlaceholder")}
          className="w-full px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
        />
      </div>
    </div>
  );
}
