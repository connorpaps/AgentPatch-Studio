"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEvalFromRun } from "@/lib/api";
import { Button } from "./ui/button";

export function CreateEvalButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await createEvalFromRun(runId);
      router.push("/evals");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create eval");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline">
      {loading ? "Creating..." : "Create Eval"}
    </Button>
  );
}
