import { complex, add, multiply, random, round, pow, abs } from 'mathjs';
import { QGateSlot } from './q-gate-slot';
import { QGateSlotOptions } from './q-gate-slot-options';
import { qBasicGates } from './q-basic-gates';
import { v4 as guid } from 'uuid';
import { qGateTransformMatrix } from './q-gate';

export type QWire = QGateSlot[];

export class QCircuit {
  wires: QWire[];
  state: {[key: string]: any}
  stateBits: number;
  cRegs: {[cRegName: string]: number[]};
  collapsed: number[];

  constructor(qubitsCount = 1) {
    this.reset(qubitsCount);
  }

  reset(qubitsCount = 1) {
    this.wires = Array(qubitsCount).fill([]);
    this.state = {
      '0': complex(1, 0)
    };
    this.stateBits = 0;
    this.cRegs = {};
    this.collapsed = [];
  }

  get qubitsCount() {
    return this.wires.length;
  }

  get qubitIds(): number[] {
    return [...this.wires.keys()];
  }

  get columnsCount() {
    return (this.wires[0] || []).length;
  }

  extendWires(wire: number) {
    if ((wire + 1) <= this.qubitsCount) {
      return;
    }

    while (this.qubitsCount < (wire + 1)) {
      this.wires.push(Array(this.columnsCount).fill(null));
    }
  }

  extendColumns(column: number) {
    if ((column + 1) <= this.columnsCount) {
      return;
    }

    for (const wire of this.wires) {
      while (wire.length < (column + 1)) {
        wire.push(null);
      }
    }
  }

  registerCReg(name: string) {
    if (!this.cRegs[name]) {
      this.cRegs[name] = [];
    }
  }

  extendCReg(name: string, bit: number) {
    this.registerCReg(name);

    while (bit >= this.cRegs[name].length) {
      this.cRegs[name].push(0);
    }
  }

  setCRegBit(name: string, bit: number, value: boolean | number) {
    this.extendCReg(name, bit);

    this.cRegs[name][bit] = value ? 1 : 0;
  }

  addGate(name: string, column: number, qubits: number[], options: QGateSlotOptions = {}) {
    const id = guid();

    this.extendColumns(column);

    for (let connector = 0; connector < qubits.length; connector++) {
      const qubit = qubits[connector];

      this.extendWires(qubit);

      if (options.cReg) {
        this.extendCReg(options.cReg.name, options.cReg.bit);
      }

      this.wires[qubit][column] = {
        id,
        name,
        connector,
        options,
        column,
        qubits,
      };
    }
  }

  applyTransform(tMatrix: number[][], qs: number[]) {
    let newState = {};
    let newStateBits = 0;

    const qubits = [...qs].reverse();
    const unusedQubits = this.qubitIds.filter(qubitId => !qubits.includes(qubitId));

    const elMask = (el: number) => {
      return qubits.reduce((res, qubit, index) => {
        if (el & (1 << index)) {
          res |= (1 << qubit);
        }
        return res;
      }, 0);
    }

    const incMask = qubits.reduce((res, qubit) => {
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

        if ((this.stateBits & colMask) === colMask) {
          const val = tMatrix[elRow][elCol];

          if (!val) {
            continue;
          }

          let row = rowMask;
          let col = colMask;

          let counter = (1 << unusedQubits.length);
          let toothless = elMask(0);

          while(counter--) {
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
    }

    this.state = newState;
    this.stateBits = newStateBits;

    if (this.stateBits === 0 && Object.keys(this.state).length == 0) {
      this.state['0'] = complex(1, 0);
    }
  }

  applyGate(name: string, column: number, qubits: number[], options: QGateSlotOptions = {}) {
    if (name === 'measure') {
      this.measure(qubits[0], options.cReg.name, options.cReg.bit);
      return;
    }

    const gate = qBasicGates[name];

    if (!gate) {
      throw new Error(`Unsupported gate "${name}"`);
    }

    const gateTransformMatrix = qGateTransformMatrix(gate);

    this.collapsed = [];

    this.applyTransform(gateTransformMatrix, qubits);
  }

  measureAll() {
    if (this.collapsed && this.collapsed.length == this.qubitsCount) {
      return this.collapsed;
    }

    this.collapsed = [];

    let r = random();
    for (const stateKey of Object.keys(this.state)) {
      const state = round(this.state[stateKey], 14);
      if (state.re || state.im) {
        const chance = round(pow(abs(state), 2) as any, 14);
        r -= chance;
        if (r <= 0) {
          const i = parseInt(stateKey);
          for (let q = 0; q < this.qubitsCount; q++) {
            console.log(q & i)
            this.collapsed.push(1 << q & i ? 1 : 0);
          }
          return this.collapsed;
        }
      }
    }

    if (!this.collapsed.length) {
      while (this.collapsed.length < this.qubitsCount) {
        this.collapsed.push(0);
      }
    }

    return this.collapsed;
  }

  measureAllMulti(shots = 1) {
    const counts = {};

    const rws = []
    for (let i = 0; i < shots; i++) {
      rws.push(random());
    }

    let shotCount = 0;
    do {
      for (const stateKey of Object.keys(this.state)) {
        const state = round(this.state[stateKey], 14);
        if (state.re || state.im) {
          const chance = round(pow(abs(state), 2) as number, 14);

          for (let sh = 0; sh < shots; sh++) {
            if (rws[sh] > 0) {
              rws[sh] -= chance;

              if (rws[sh] <= 0) {
                let bin = parseInt(stateKey).toString(2);
                while (bin.length < this.qubitsCount) {
                  bin = '0' + bin;
                }

                if (counts[bin]) {
                  counts[bin]++;
                } else {
                  counts[bin] = 1;
                }

                shotCount++;

                if (shotCount == shots) {
                  return counts;
                }
              }
            }
          }
        }
      }
    } while (shotCount < shots)
  }

  measure(qubit: number, cRegName: string, bit: number) {
    this.measureAll();

    this.setCRegBit(cRegName, bit, this.collapsed[qubit]);
  }

  run() {
    for (let column = 0; column < this.columnsCount; column++) {
      for (let wire = 0; wire < this.qubitsCount; wire++) {
        const gate = this.wires[wire][column];

        if (!gate || gate.connector !== 0) {
          continue;
        }

        this.applyGate(gate.name, column, gate.qubits, gate.options);
      }
    }
  }
}