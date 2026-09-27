export const CABINET_GROUPS = ['甲', '乙', '丙'] as const
export type CabinetGroup = (typeof CABINET_GROUPS)[number]

export interface CabinetSlot {
  id?: number
  label: string
  group: CabinetGroup
  slotNo: number
  capacity: number
  schemaRev?: number
}

export type CabinetSlotInput = Omit<CabinetSlot, 'id' | 'label' | 'schemaRev'>

export function cabinetLabel(group: CabinetGroup, slotNo: number): string {
  return `${group}柜-${String(slotNo).padStart(2, '0')}`
}

const LABEL_PATTERN = /^([甲乙丙])柜-(\d+)$/

export function parseCabinetLabel(label: string): { group: CabinetGroup; slotNo: number } | null {
  const match = LABEL_PATTERN.exec(label.trim())
  if (!match) return null
  return { group: match[1] as CabinetGroup, slotNo: Number(match[2]) }
}
