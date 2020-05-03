import { QCpuGate } from './q-cpu-gate';
import { QCpu } from './q-cpu';

const gates: QCpuGate[] = [
  {name: 'x', qubits: [1]},
  {name: 'h', qubits: [1]},
  {name: 'h', qubits: [0]},
  // {name: 'x', qubits: [1]},
  {name: 'cx', qubits: [0, 1]},
  {name: 'h', qubits: [0]},
];

const cpu = new QCpu();

console.log(cpu.run(gates, 1000000));

console.log(cpu);
