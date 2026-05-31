import { requireAdmin } from "@/lib/auth";
import { CategoryForm } from "../category-form";

export default async function NewCategoryPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New category</h1>
      <CategoryForm />
    </div>
  );
}
