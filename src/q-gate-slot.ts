import { QGateSlotOptions } from './q-gate-slot-options';

export interface QGateSlot {
  id: string;
  name: string;
  connector: number;
  column: number;
  qubits: number[];
  options: QGateSlotOptions;
}