"use client";

import { useState } from "react";
import { X, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface TagComboboxProps {
  label: string;
  options: string[];
  popular: string[];
  selected: string[];
  onToggle: (v: string) => void;
}

export function TagCombobox({ label, options, popular, selected, onToggle }: TagComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const rest = options.filter((o) => !popular.includes(o));
  const trimmed = inputValue.trim();
  const isNew =
    trimmed.length > 0 &&
    !options.some((o) => o.toLowerCase() === trimmed.toLowerCase()) &&
    !selected.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  function handleSelect(value: string) {
    onToggle(value);
    setInputValue("");
    setOpen(false);
  }

  function handleCreate() {
    if (!trimmed) return;
    onToggle(trimmed);
    setInputValue("");
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((s) => (
          <Badge key={s} variant="secondary" className="gap-1 pr-1 text-xs">
            {s}
            <button
              type="button"
              onClick={() => onToggle(s)}
              className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 gap-1 border-dashed px-2 text-xs">
              Add <ChevronsUpDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput
                placeholder={`Search or create…`}
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                {isNew && (
                  <CommandGroup>
                    <CommandItem value={`__create__${trimmed}`} onSelect={handleCreate}>
                      <Plus className="mr-2 h-3.5 w-3.5 shrink-0" />
                      Create &ldquo;{trimmed}&rdquo;
                    </CommandItem>
                  </CommandGroup>
                )}
                {!isNew && <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>}
                {popular.length > 0 && (
                  <CommandGroup heading="Popular">
                    {popular.map((o) => (
                      <CommandItem key={o} value={o} onSelect={() => handleSelect(o)}>
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5 shrink-0",
                            selected.includes(o) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {o}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {rest.length > 0 && (
                  <CommandGroup heading={popular.length > 0 ? "All" : undefined}>
                    {rest.map((o) => (
                      <CommandItem key={o} value={o} onSelect={() => handleSelect(o)}>
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5 shrink-0",
                            selected.includes(o) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {o}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
