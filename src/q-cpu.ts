import { abs, add, Complex, complex, multiply, pow, random, round } from 'mathjs';
import { QCpuGate } from './q-cpu-gate';
import { qBasicGates } from './q-basic-gates';
import { qGateTransformMatrix } from './q-gate';

export class QCpu {
  state: { [key: string]: Complex }
  stateBits: number;
  collapsed: number[];

  qubits: number[];

  resetState() {
    this.state = {
      '0': complex(1, 0)
    }
    this.stateBits = 0;
    this.collapsed = [];
  }

  resetQubits(gates: QCpuGate[]) {
    let lastQubit = 0;
    for (const gate of gates) {
      for (const qubit of gate.qubits) {
        if (qubit > lastQubit) {
          lastQubit = qubit;
        }
      }
    }
    this.qubits = [...Array(lastQubit + 1).keys()];
  }

  run(gates: QCpuGate[], times = 1) {
    this.resetState();
    this.resetQubits(gates);

    for (const gate of gates) {
      this.applyGate(gate);
    }

    return this.measureAll(times);
  }

  applyGate(gate: QCpuGate) {
    const basicGate = qBasicGates[gate.name];

    if (!gate) {
      throw new Error(`Unsupported gate "${gate.name}"`);
    }

    this.collapsed = [];
    this.applyTransform(qGateTransformMatrix(basicGate), gate.qubits);
  }

  applyTransform(tMatrix: number[][], qubits: number[]) {
    let newState = {};
    let newStateBits = 0;

    const reversedQubits = [...qubits].reverse();
    const unusedQubits = this.qubits.filter(qubitId => !reversedQubits.includes(qubitId));

    const elMask = (el: number) => {
      return reversedQubits.reduce((res, qubit, index) => {
        if (el & (1 << index)) {
          res |= (1 << qubit);
        }
        return res;
      }, 0);
    }

    const incMask = reversedQubits.reduce((res, qubit) => {
      res |= (1 << qubit);
      return res;
    }, 0) + 1;

    const notMask = unusedQubits.reduce((res, qubit) => {
      res |= (1 << qubit);
      return res;
    }, 0);

    for (let elRow = 0; elRow < tMatrix.length; elRow++) {
      const rowMask = elMask(elRow);

      for (let elCol = 0; elCol < tMatrix[elRow].length; elCol++) {
        const colMask = elMask(elCol);

        if ((this.stateBits & colMask) !== colMask) {
          continue;
        }

        const val = tMatrix[elRow][elCol];

        if (!val) {
          continue;
        }

        let row = rowMask;
        let col = colMask;
        let counter = (1 << unusedQubits.length);
        let toothless = elMask(0);
        while (counter--) {
          const state = this.state[col];

          if (state) {
            row = toothless | rowMask;
            newState[row] = add(newState[row] || complex(0, 0), val === 1 ? state : multiply(val, state));
            newStateBits |= row;
          }

          toothless = (toothless + incMask) & notMask;
          col = toothless | colMask;
        }
      }
    }

    this.state = newState;
    this.stateBits = newStateBits;

    if (this.stateBits === 0 && Object.keys(this.state).length == 0) {
      this.state['0'] = complex(1, 0);
    }
  }

  measureAll(shots = 1) {
    const counts = {};

    const randomWeights = []
    for (let i = 0; i < shots; i++) {
      randomWeights.push(random());
    }

    let shotCount = 0;
    do {
      for (const stateKey of Object.keys(this.state)) {
        const state = round(this.state[stateKey], 14);

        if (!(state.re || state.im)) {
          continue;
        }

        const chance = round(pow(abs(state), 2) as number, 14);
        for (let shot = 0; shot < shots; shot++) {
          if (randomWeights[shot] <= 0) {
            continue;
          }

          randomWeights[shot] -= chance;

          if (randomWeights[shot] > 0) {
            continue;
          }

          let binary = parseInt(stateKey).toString(2);
          binary = binary.padStart(this.qubits.length, '0');

          if (counts[binary]) {
            counts[binary]++;
          } else {
            counts[binary] = 1;
          }

          shotCount++;

          if (shotCount == shots) {
            return counts;
          }
        }
      }
    } while (shotCount < shots)
  }
}
