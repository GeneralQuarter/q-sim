import { QGate } from './q-gate';

export const qBasicGates: { [name: string]: QGate } = {
  x: {
    name: 'x',
    description: 'Pauli X (PI rotation over X-axis) aka "NOT" gate',
    matrix: [
      [0, 1],
      [1, 0]
    ]
  },
  h: {
    name: 'h',
    description: 'Hadamard gate',
    matrix: [
      ['1 / sqrt(2)', '1 / sqrt(2)'],
      ['1 / sqrt(2)', '-1 / sqrt(2)']
    ]
  },
  cx: {
    name: 'cx',
    description: 'Controlled NOT (CNOT) gate',
    matrix: [
      [1,0,0,0],
      [0,1,0,0],
      [0,0,0,1],
      [0,0,1,0]
    ]
  }
}