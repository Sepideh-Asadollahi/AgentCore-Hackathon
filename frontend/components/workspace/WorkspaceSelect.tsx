"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {createLogger} from "@/lib/app-logger";
import {cn} from "@/lib/utils";
import {wsFieldControl} from "@/lib/workspace-ui";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

const selectLog = createLogger("workspace-select");

export type WorkspaceSelectOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: WorkspaceSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  /** Native `<select>` name for SSR form posts before hydration. */
  name?: string;
  triggerClassName?: string;
  contentClassName?: string;
  "aria-label"?: string;
};

function resolveValue(value: string, options: WorkspaceSelectOption[]): string {
  if (options.some(o => o.value === value)) return value;
  return options[0]?.value ?? "";
}

/** Native SSR fallback, then a styled Radix select after hydration. */
export function WorkspaceSelect({
  id,
  value,
  onValueChange,
  options,
  disabled,
  placeholder = "Choose…",
  name,
  triggerClassName,
  contentClassName,
  "aria-label": ariaLabel,
}: Props) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const [mounted, setMounted] = useState(false);
  const effectiveValue = useMemo(() => resolveValue(value, options), [value, options]);
  const isDisabled = disabled || options.length === 0;

  useEffect(() => {
    if (mounted) return;
    const selectedBeforeHydration = selectRef.current?.value ?? "";
    if (
      selectedBeforeHydration &&
      selectedBeforeHydration !== effectiveValue &&
      options.some(option => option.value === selectedBeforeHydration)
    ) {
      selectLog.info("sync pre-hydration selection", {id, value, selectedBeforeHydration});
      onValueChange(selectedBeforeHydration);
    }
    setMounted(true);
  }, [effectiveValue, id, mounted, onValueChange, options, value]);

  useEffect(() => {
    if (options.length === 0) return;
    if (effectiveValue === value) return;
    if (!effectiveValue) return;
    selectLog.debug("sync controlled value to resolved option", {id, value, effectiveValue});
    onValueChange(effectiveValue);
  }, [effectiveValue, value, onValueChange, id, options.length]);

  if (!mounted) {
    return (
      <select
        ref={selectRef}
        id={id}
        name={name}
        aria-label={ariaLabel}
        disabled={isDisabled}
        value={effectiveValue}
        onChange={e => {
          const next = e.target.value;
          selectLog.info("native select change", {
            id,
            next,
            previousControlled: value,
            effectiveValue,
          });
          onValueChange(next);
        }}
        className={cn(wsFieldControl, "cursor-pointer disabled:cursor-not-allowed", triggerClassName)}
      >
        {options.length === 0 ? (
          <option value="">{placeholder}</option>
        ) : (
          options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        )}
      </select>
    );
  }

  return (
    <Select
      name={name}
      value={effectiveValue}
      disabled={isDisabled}
      onValueChange={next => {
        selectLog.info("styled select change", {id, next, previousControlled: value, effectiveValue});
        onValueChange(next);
      }}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "mt-1.5 rounded-xl hover:border-ring/50 data-[state=open]:border-ring/60 data-[state=open]:ring-[3px] data-[state=open]:ring-ring/20",
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn("rounded-xl p-1.5", contentClassName)}>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value} className="rounded-lg">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
