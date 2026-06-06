"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PressureMeter } from "@/components/PressureMeter";
import { useStore } from "@/lib/store";
import { PRESSURE_SOURCES, type PressureSource } from "@/lib/types";

// Section 3: Pressure Meter — anxiety level + what is creating it.
export function PressureCard() {
  const day = useStore((s) => s.getDay());
  const updateDay = useStore((s) => s.updateDay);

  const toggleSource = (src: PressureSource) => {
    const has = day.pressureSources.includes(src);
    updateDay({
      pressureSources: has
        ? day.pressureSources.filter((s) => s !== src)
        : [...day.pressureSources, src],
    });
  };

  return (
    <Card className="p-5">
      <PressureMeter
        value={day.pressureLevel}
        onChange={(v) => updateDay({ pressureLevel: v })}
      />
      <div className="mt-5">
        <p className="mb-2.5 text-sm text-mist-300">What is creating pressure?</p>
        <div className="flex flex-wrap gap-2">
          {PRESSURE_SOURCES.map((src) => (
            <Chip
              key={src}
              selected={day.pressureSources.includes(src)}
              onClick={() => toggleSource(src)}
            >
              {src}
            </Chip>
          ))}
        </div>
      </div>
    </Card>
  );
}
