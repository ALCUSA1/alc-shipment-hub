import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { CargoLine, ContainerLine } from "@/lib/shipment-dataset";
import { emptyCargoLine, emptyContainerLine } from "@/lib/shipment-dataset";
import { ContainerCard } from "./cargo/ContainerCard";
import { CargoLineCard } from "./cargo/CargoLineCard";
import { useEffect, useRef } from "react";

const CONTAINER_TYPES = [
  { value: "20gp", label: "20' GP" }, { value: "40gp", label: "40' GP" },
  { value: "40hc", label: "40' HC" }, { value: "45hc", label: "45' HC" },
  { value: "20rf", label: "20' Reefer" }, { value: "40rf", label: "40' Reefer" },
  { value: "20ot", label: "20' Open Top" }, { value: "40ot", label: "40' Open Top" },
  { value: "20fr", label: "20' Flat Rack" }, { value: "40fr", label: "40' Flat Rack" },
];

export const PACKAGE_TYPES = ["Carton", "Pallet", "Crate", "Drum", "Bag", "Bundle", "Roll", "Bale"];

export const RATE_CLASSES = [
  { value: "M", label: "M — Minimum" },
  { value: "N", label: "N — Normal" },
  { value: "Q45", label: "Q — 45 kg+" },
  { value: "Q100", label: "Q — 100 kg+" },
  { value: "Q250", label: "Q — 250 kg+" },
  { value: "Q500", label: "Q — 500 kg+" },
  { value: "Q1000", label: "Q — 1000 kg+" },
  { value: "C", label: "C — Specific Commodity" },
  { value: "U", label: "U — ULD" },
];

interface Props {
  cargoLines: CargoLine[];
  containers: ContainerLine[];
  onCargoChange: (lines: CargoLine[]) => void;
  onContainerChange: (lines: ContainerLine[]) => void;
  mode?: string;
}

export function CargoSection({ cargoLines, containers, onCargoChange, onContainerChange, mode = "ocean" }: Props) {
  const isAir = mode === "air";
  const prevContainerCount = useRef(containers.length);

  // Auto-assign: when there's exactly one container, silently assign all unassigned cargo to it
  useEffect(() => {
    if (isAir || containers.length !== 1) return;
    const cid = containers[0].id;
    const needsUpdate = cargoLines.some(c => !c.containerId || c.containerId !== cid);
    if (needsUpdate) {
      onCargoChange(cargoLines.map(c => ({ ...c, containerId: cid })));
    }
  }, [containers.length, isAir]);

  // When a container is deleted, unassign cargo that referenced it
  useEffect(() => {
    if (containers.length < prevContainerCount.current) {
      const validIds = new Set(containers.map(c => c.id));
      const needsCleanup = cargoLines.some(c => c.containerId && !validIds.has(c.containerId));
      if (needsCleanup) {
        onCargoChange(cargoLines.map(c =>
          c.containerId && !validIds.has(c.containerId) ? { ...c, containerId: "" } : c
        ));
      }
    }
    prevContainerCount.current = containers.length;
  }, [containers.length]);

  const updateCargo = (idx: number, f: keyof CargoLine, v: any) => {
    const next = [...cargoLines];
    (next[idx] as any)[f] = v;

    if (isAir && (f === "grossWeight" || f === "volume" || f === "dimensions")) {
      const line = next[idx];
      const gross = parseFloat(line.grossWeight) || 0;
      let volumetric = 0;
      if (line.dimensions) {
        const parts = line.dimensions.toLowerCase().split(/[x×*]/).map(s => parseFloat(s.trim()));
        if (parts.length === 3 && parts.every(p => !isNaN(p))) {
          const pieces = parseInt(line.pieces) || 1;
          volumetric = (parts[0] * parts[1] * parts[2] * pieces) / 6000;
        }
      } else if (line.volume) {
        volumetric = (parseFloat(line.volume) || 0) * 166.67;
      }
      line.chargeableWeight = Math.max(gross, volumetric).toFixed(1);
    }

    onCargoChange(next);
  };

  const updateContainer = (idx: number, f: keyof ContainerLine, v: string) => {
    const next = [...containers];
    (next[idx] as any)[f] = v;
    onContainerChange(next);
  };

  const addCargoToContainer = (containerId: string) => {
    const newLine = emptyCargoLine();
    newLine.containerId = containerId;
    onCargoChange([...cargoLines, newLine]);
  };

  const moveCargoToContainer = (cargoIdx: number, containerId: string) => {
    const next = [...cargoLines];
    next[cargoIdx] = { ...next[cargoIdx], containerId };
    onCargoChange(next);
  };

  // Group cargo by container for the container-centric view
  const getContainerCargo = (containerId: string) =>
    cargoLines.map((c, idx) => ({ cargo: c, originalIdx: idx })).filter(({ cargo }) => cargo.containerId === containerId);

  const unassignedCargo = cargoLines.map((c, idx) => ({ cargo: c, originalIdx: idx })).filter(({ cargo }) => !cargo.containerId);

  const hasMultipleContainers = containers.length > 1;

  return (
    <section id="cargo" className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-foreground tracking-tight">
          {isAir ? "Cargo & Pieces" : "Cargo & Containers"}
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isAir
            ? "Cargo details for Air Waybill, packing list, and customs filing."
            : "Add containers, then add commodity lines inside each one."}
        </p>
      </div>

      <div className="space-y-6">
        {isAir ? (
          /* Air mode — flat cargo list, no containers */
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Cargo Details</span>
              <Button variant="ghost" size="sm" className="text-[11px] h-7 text-accent" onClick={() => onCargoChange([...cargoLines, emptyCargoLine()])}>
                <Plus className="h-3 w-3 mr-1" /> Cargo Line
              </Button>
            </div>
            {cargoLines.map((c, i) => (
              <CargoLineCard
                key={c.id}
                cargo={c}
                index={i}
                isAir={true}
                canDelete={cargoLines.length > 1}
                containers={[]}
                allContainers={containers}
                onUpdate={(f, v) => updateCargo(i, f, v)}
                onDelete={() => onCargoChange(cargoLines.filter((_, j) => j !== i))}
                onMoveToContainer={() => {}}
              />
            ))}
          </div>
        ) : (
          /* Ocean mode — container-centric layout */
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Equipment & Cargo</span>
              <Button variant="ghost" size="sm" className="text-[11px] h-7 text-accent" onClick={() => onContainerChange([...containers, emptyContainerLine()])}>
                <Plus className="h-3 w-3 mr-1" /> Container
              </Button>
            </div>

            {containers.map((container, containerIdx) => {
              const assigned = getContainerCargo(container.id);
              return (
                <ContainerCard
                  key={container.id}
                  container={container}
                  index={containerIdx}
                  canDelete={containers.length > 1}
                  containerTypes={CONTAINER_TYPES}
                  assignedCargo={assigned}
                  allContainers={containers}
                  onUpdate={(f, v) => updateContainer(containerIdx, f, v)}
                  onDelete={() => onContainerChange(containers.filter((_, j) => j !== containerIdx))}
                  onAddCargo={() => addCargoToContainer(container.id)}
                  onUpdateCargo={(origIdx, f, v) => updateCargo(origIdx, f, v)}
                  onDeleteCargo={(origIdx) => onCargoChange(cargoLines.filter((_, j) => j !== origIdx))}
                  onMoveCargo={(origIdx, targetContainerId) => moveCargoToContainer(origIdx, targetContainerId)}
                  canDeleteCargo={cargoLines.length > 1}
                />
              );
            })}

            {/* Unassigned cargo (only when multiple containers) */}
            {hasMultipleContainers && unassignedCargo.length > 0 && (
              <div className="rounded-xl border-2 border-dashed border-yellow-400/50 bg-yellow-50/30 dark:bg-yellow-950/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-[11px] font-semibold text-yellow-700 dark:text-yellow-400">
                      {unassignedCargo.length} unassigned commodity line{unassignedCargo.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Drag to a container or use the move button</span>
                </div>
                {unassignedCargo.map(({ cargo, originalIdx }) => (
                  <CargoLineCard
                    key={cargo.id}
                    cargo={cargo}
                    index={originalIdx}
                    isAir={false}
                    canDelete={cargoLines.length > 1}
                    containers={[]}
                    allContainers={containers}
                    onUpdate={(f, v) => updateCargo(originalIdx, f, v)}
                    onDelete={() => onCargoChange(cargoLines.filter((_, j) => j !== originalIdx))}
                    onMoveToContainer={(targetId) => moveCargoToContainer(originalIdx, targetId)}
                    isUnassigned
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
