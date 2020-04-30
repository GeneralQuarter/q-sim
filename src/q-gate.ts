import { evaluate } from 'mathjs';

export type MathExpOrNumber = string | number;

export interface QGate {
  name: string;
  description: string;
  matrix: MathExpOrNumber[][];
}

export function qGateTransformMatrix(gate: QGate): number[][] {
  return gate.matrix.map(row => row.map(col => {
    if (typeof col === 'string') {
      return evaluate(col);
    } else {
      return col;
    }
  }));
}