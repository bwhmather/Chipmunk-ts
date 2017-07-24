/* Copyright (c) 2017 Ben Mather
 * Forked from Chipmunk JS, copyright (c) 2013 Seph Gentle
 * Ported from Chipmunk, copyright (c) 2010 Scott Lembcke
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

import { Body } from "../body";
import { clamp } from "../util";
import { Constraint } from "./constraint";
import { bias_coef } from "./util";

export class GearJoint extends Constraint {
    phase: number;
    ratio: number;
    ratio_inv: number;

    jAcc: number;
    iSum: number;
    bias: number;
    jMax: number;

    constructor(a: Body, b: Body, phase: number, ratio: number) {
        super(a, b);

        this.phase = phase;
        this.ratio = ratio;
        this.ratio_inv = 1 / ratio;

        this.jAcc = 0;

        this.iSum = this.bias = this.jMax = 0;
    }

    preStep(dt: number): void {
        const a = this.a;
        const b = this.b;

        // calculate moment of inertia coefficient.
        this.iSum = 1 / (a.i_inv * this.ratio_inv + this.ratio * b.i_inv);

        // calculate bias velocity
        const maxBias = this.maxBias;
        this.bias = clamp(-bias_coef(this.errorBias, dt) * (b.a * this.ratio - a.a - this.phase) / dt, -maxBias, maxBias);

        // compute max impulse
        this.jMax = this.maxForce * dt;
    }

    applyCachedImpulse(dt_coef: number): void {
        const a = this.a;
        const b = this.b;

        const j = this.jAcc * dt_coef;
        a.w -= j * a.i_inv * this.ratio_inv;
        b.w += j * b.i_inv;
    }

    applyImpulse(): void {
        const a = this.a;
        const b = this.b;

        // compute relative rotational velocity
        const wr = b.w * this.ratio - a.w;

        // compute normal impulse
        let j = (this.bias - wr) * this.iSum;
        const jOld = this.jAcc;
        this.jAcc = clamp(jOld + j, -this.jMax, this.jMax);
        j = this.jAcc - jOld;

        // apply impulse
        a.w -= j * a.i_inv * this.ratio_inv;
        b.w += j * b.i_inv;
    }

    getImpulse(): number {
        return Math.abs(this.jAcc);
    }

    setRatio(value: number): void {
        this.ratio = value;
        this.ratio_inv = 1 / value;
        this.activateBodies();
    }
}
