/* Copyright (c) 2007 Scott Lembcke
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { Constraint } from './constraint';
import { bias_coef } from './util';
import { clamp } from '../util';
import { Body } from '../body';

class RotaryLimitJoint extends Constraint {
    min: number;
    max: number;

    jAcc: number;
    iSum: number;
    bias: number;
    jMax: number;

    constructor(a: Body, b: Body, min: number, max: number) {
        super(a, b);

        this.min = min;
        this.max = max;

        this.jAcc = 0;

        this.iSum = this.bias = this.jMax = 0;
    }

    preStep(dt: number): void {
        const a = this.a;
        const b = this.b;

        const dist = b.a - a.a;
        let pdist = 0;
        if (dist > this.max) {
            pdist = this.max - dist;
        } else if (dist < this.min) {
            pdist = this.min - dist;
        }

        // calculate moment of inertia coefficient.
        this.iSum = 1 / (1 / a.i + 1 / b.i);

        // calculate bias velocity
        const maxBias = this.maxBias;
        this.bias = clamp(-bias_coef(this.errorBias, dt) * pdist / dt, -maxBias, maxBias);

        // compute max impulse
        this.jMax = this.maxForce * dt;

        // If the bias is 0, the joint is not at a limit. Reset the impulse.
        if (!this.bias) this.jAcc = 0;
    }

    applyCachedImpulse(dt_coef: number): void {
        const a = this.a;
        const b = this.b;

        const j = this.jAcc * dt_coef;
        a.w -= j * a.i_inv;
        b.w += j * b.i_inv;
    }

    applyImpulse() {
        if (!this.bias) return; // early exit

        const a = this.a;
        const b = this.b;

        // compute relative rotational velocity
        const wr = b.w - a.w;

        // compute normal impulse	
        let j = -(this.bias + wr) * this.iSum;
        const jOld = this.jAcc;
        if (this.bias < 0) {
            this.jAcc = clamp(jOld + j, 0, this.jMax);
        } else {
            this.jAcc = clamp(jOld + j, -this.jMax, 0);
        }
        j = this.jAcc - jOld;

        // apply impulse
        a.w -= j * a.i_inv;
        b.w += j * b.i_inv;
    }

    getImpulse(): number {
        return Math.abs(this.jAcc);
    }
}

