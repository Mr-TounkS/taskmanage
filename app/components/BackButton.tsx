"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="absolute top-4 left-4 btn btn-ghost btn-sm btn-circle"
      title="Retour à la page précédente"
      aria-label="Retour"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
