import { CABINET_GROUPS, type CabinetGroup, type CabinetSlot } from '../types/cabinet-slot'
import type { PaperSample } from '../types/paper-sample'

export function slotCode(group: CabinetGroup, cellNo: number): string {
  return `${group}柜-${String(cellNo).padStart(2, '0')}`
}

export function parseSlotCode(code: string): { group: CabinetGroup; cellNo: number } | null {
  const match = /^([甲乙丙])柜-(\d{1,3})$/.exec(code.trim())
  if (!match) return null
  return { group: match[1] as CabinetGroup, cellNo: Number(match[2]) }
}

export function sortSlots(slots: CabinetSlot[]): CabinetSlot[] {
  return [...slots].sort((a, b) => {
    const groupDiff = CABINET_GROUPS.indexOf(a.group) - CABINET_GROUPS.indexOf(b.group)
    return groupDiff !== 0 ? groupDiff : a.cellNo - b.cellNo
  })
}

export function countSamplesBySlot(samples: PaperSample[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const sample of samples) {
    counts.set(sample.archiveBin, (counts.get(sample.archiveBin) ?? 0) + 1)
  }
  return counts
}

export function slotPlaced(slot: CabinetSlot, counts: Map<string, number>): number {
  return counts.get(slotCode(slot.group, slot.cellNo)) ?? 0
}

export function isSlotFull(slot: CabinetSlot, counts: Map<string, number>): boolean {
  return slotPlaced(slot, counts) >= slot.capacity
}
