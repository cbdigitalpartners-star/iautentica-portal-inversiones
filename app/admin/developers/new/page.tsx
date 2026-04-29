import { DeveloperForm } from "@/components/admin/developer-form";

export default function NewDeveloperPage() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Nueva inmobiliaria</h1>
      <DeveloperForm mode="create" />
    </div>
  );
}
