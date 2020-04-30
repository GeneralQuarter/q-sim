import { QCircuit } from './q-circuit';

const circuit = new QCircuit(1);

circuit.addGate('h', 0, [0]);
// circuit.addGate('cx', 1, [0, 1]);

circuit.run();

console.log(circuit.state);
console.log(circuit.measureAllMulti(1000000));