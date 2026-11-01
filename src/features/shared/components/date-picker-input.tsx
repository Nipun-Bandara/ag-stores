"use client";

import { useRef, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { enUS } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";

const sinhalaMonths = Array.from({ length: 12 }, (_, month) => {
  const date = new Date(2020, month, 1);
  return (["short", "long"] as const).map(
    (length) =>
      [
        new Intl.DateTimeFormat("si-LK", { month: length }).format(date),
        format(date, "MMM", { locale: enUS }),
      ] as const,
  );
})
  .flat()
  .sort(([left], [right]) => right.length - left.length);

export function DatePickerInput({
  initialDate = "",
  name,
  label,
  id,
}: {
  initialDate?: string;
  name: string;
  label: string;
  id: string;
}) {
  const t = useText();
  const locale = useLocale();
  const dateLocale = locale === "si" ? "si-LK" : "en-LK";
  const inputRef = useRef<HTMLInputElement>(null);
  function parseDate(value: string): Date | undefined {
    let normalized = value.trim();
    for (const [sinhala, english] of sinhalaMonths)
      normalized = normalized.replaceAll(sinhala, english);
    for (const pattern of [
      "yyyy-MM-dd",
      "dd MMM yyyy",
      "yyyy MMM dd",
      "MMMM dd, yyyy",
      "MMM dd, yyyy",
    ]) {
      const parsed = parse(normalized, pattern, new Date(), {
        locale: enUS,
      });
      if (isValid(parsed)) return parsed;
    }
    return undefined;
  }
  function displayDate(date: Date | undefined) {
    return date
      ? new Intl.DateTimeFormat(dateLocale, {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(date)
      : "";
  }
  const [selected, setSelected] = useState(() => parseDate(initialDate));
  const [value, setValue] = useState(() => displayDate(parseDate(initialDate)));
  const [month, setMonth] = useState(
    () => parseDate(initialDate) ?? new Date(),
  );
  const [open, setOpen] = useState(false);
  const invalid = Boolean(value.trim() && !selected);
  function chooseDate(date: Date | undefined) {
    setSelected(date);
    setValue(displayDate(date));
    if (date) setMonth(date);
    inputRef.current?.setCustomValidity("");
    setOpen(false);
  }

  return (
    <Field className="min-w-0 gap-0">
      <FieldLabel htmlFor={`${id}-input`}>{label}</FieldLabel>
      <Input
        type="hidden"
        name={name}
        value={selected ? format(selected, "yyyy-MM-dd") : ""}
      />
      <InputGroup className="mt-1.5 h-10">
        <InputGroupInput
          ref={inputRef}
          id={`${id}-input`}
          value={value}
          placeholder={displayDate(new Date(2025, 5, 1))}
          autoComplete="off"
          aria-invalid={invalid}
          aria-describedby={`${id}-help`}
          onChange={(event) => {
            const text = event.target.value;
            const date = parseDate(text);
            setValue(text);
            setSelected(date);
            if (date) setMonth(date);
            event.target.setCustomValidity(
              text.trim() && !date
                ? t("Enter a valid date, for example 2026-10-31.")
                : "",
            );
          }}
          onBlur={() => {
            if (selected) setValue(displayDate(selected));
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        />
        <InputGroupAddon align="inline-end" className="pr-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <InputGroupButton
                  type="button"
                  variant="ghost"
                  id={`${id}-picker`}
                  size="icon-xs"
                  aria-label={t("Select date")}
                >
                  <CalendarDays aria-hidden="true" />
                  <span className="sr-only">{t("Select date")}</span>
                </InputGroupButton>
              }
            />
            <PopoverContent
              align="end"
              alignOffset={-8}
              sideOffset={10}
              className="w-auto max-w-[calc(100vw-2rem)] overflow-hidden p-0"
              aria-label={label}
            >
              <Calendar
                mode="single"
                selected={selected}
                month={month}
                onMonthChange={setMonth}
                onSelect={chooseDate}
                locale={enUS}
                {...(locale === "si"
                  ? {
                      formatters: {
                        formatCaption: (date: Date) =>
                          new Intl.DateTimeFormat("si-LK", {
                            month: "long",
                            year: "numeric",
                          }).format(date),
                        formatWeekdayName: (date: Date) =>
                          new Intl.DateTimeFormat("si-LK", {
                            weekday: "narrow",
                          }).format(date),
                      },
                    }
                  : {})}
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
      <p
        id={`${id}-help`}
        className={`mt-1 text-xs ${invalid ? "text-destructive" : "text-muted-foreground"}`}
      >
        {invalid
          ? t("Enter a valid date, for example 2026-10-31.")
          : t("Type a date or choose from the calendar.")}
      </p>
    </Field>
  );
}
