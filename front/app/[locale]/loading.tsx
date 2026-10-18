import { SelectionSkeleton } from "@/components/Selection";
import fr from "@/i18n/dictionaries/fr.json";

export default function LocaleLoading() {
  return (
    <main>
      <SelectionSkeleton label={fr.home.selection.loading} />
    </main>
  );
}
