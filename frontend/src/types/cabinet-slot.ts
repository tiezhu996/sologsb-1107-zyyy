export const CABINET_GROUPS = ['甲', '乙', '丙'] as const
export type CabinetGroup = (typeof CABINET_GROUPS)[number]

export interface CabinetSlot {
  id?: number
  group: CabinetGroup
  cellNo: number
  capacity: number
  schemaRev?: number
}

export type CabinetSlotInput = Omit<CabinetSlot, 'id' | 'schemaRev'>
