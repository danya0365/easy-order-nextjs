"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "./Input";
import { Button } from "./Button";
import { genPassword } from "@/src/presentation/lib/gen-password";

/**
 * Password input with a randomize (generate) button. Controlled so the button can
 * fill it, but still submits via `name` in the surrounding `<form action>` →
 * FormData. Shown as plain text on purpose: the admin reads it out / hands it to
 * the new shop owner.
 */
export function GeneratedPasswordField({
  name = "ownerPassword",
  defaultValue = "",
}: {
  name?: string;
  defaultValue?: string;
}) {
  const t = useTranslations("common");
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex items-center gap-1.5">
      <Input
        id={name}
        name={name}
        type="text"
        required
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={() => setValue(genPassword())}
      >
        <Shuffle className="size-4" />
        {t("randomize")}
      </Button>
    </div>
  );
}
