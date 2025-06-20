"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerWithRangeProps {
  className?: string;
}

export function DatePickerWithRange({ className }: DatePickerWithRangeProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          className
        )}
      >
        <CalendarDays className="mr-2 h-4 w-4" />
        Seleccionar fechas
      </Button>
    </div>
  );
}