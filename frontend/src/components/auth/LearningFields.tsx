"use client";

import { BookOpen, Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuthSelect } from "@/components/auth/AuthSelect";
import type { AppLocale } from "@/i18n/routing";

export const LEARN_TARGETS = ["german", "technology", "both"] as const;
export type LearnTarget = (typeof LEARN_TARGETS)[number];

const LEARN_WITH: AppLocale[] = ["en", "fr", "de", "es"];

export function isLearnTarget(value: string): value is LearnTarget {
  return (LEARN_TARGETS as readonly string[]).includes(value);
}

export function storedLearnTarget(value: LearnTarget): string {
  if (value === "german") return "German";
  if (value === "technology") return "Technology";
  return "German, Technology";
}

const TARGET_KEY = "multivate_learn_target";
const WITH_KEY = "multivate_learn_with";
const EMAIL_KEY = "multivate_auth_email";

export function rememberLearning(target: string, learnWith: string) {
  try {
    localStorage.setItem(TARGET_KEY, target);
    localStorage.setItem(WITH_KEY, learnWith);
  } catch {
    /* storage can be blocked */
  }
}

export function readRememberedTarget(): string {
  try {
    const value = localStorage.getItem(TARGET_KEY) ?? "";
    return isLearnTarget(value) ? value : "";
  } catch {
    return "";
  }
}

export function rememberAuthEmail(email: string) {
  try {
    sessionStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* storage can be blocked */
  }
}

export function readAuthEmail(): string {
  try {
    return sessionStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function LearningFields({
  learn,
  learnWith,
  onLearn,
  onLearnWith,
  learnLabel,
  withLabel,
}: {
  learn: string;
  learnWith: string;
  onLearn: (value: string) => void;
  onLearnWith: (value: AppLocale) => void;
  learnLabel?: string;
  withLabel?: string;
}) {
  const t = useTranslations("auth.learning");
  const tNames = useTranslations("localeNames");

  return (
    <>
      <AuthSelect
        id="learn-target"
        label={learnLabel ?? t("learnLabel")}
        icon={BookOpen}
        required
        value={learn}
        onChange={onLearn}
      >
        <option value="">{t("placeholder")}</option>
        <option value="german">{t("learnGerman")}</option>
        <option value="technology">{t("learnTechnology")}</option>
        <option value="both">{t("learnBoth")}</option>
      </AuthSelect>
      <AuthSelect
        id="learn-with"
        label={withLabel ?? t("learnWithLabel")}
        icon={Languages}
        required
        value={learnWith}
        onChange={(value) => onLearnWith(value as AppLocale)}
      >
        {LEARN_WITH.map((code) => (
          <option key={code} value={code}>
            {tNames(code)}
          </option>
        ))}
      </AuthSelect>
    </>
  );
}
