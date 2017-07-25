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
import { biasCoef } from "./util";

export class RatchetJoint extends Constraint {
    angle: number;
    phase: number;

    ratchet: number;
    iSum: number;
    bias: number;
    jAcc: number;
    jMax: number;

    constructor(a: Body, b: Body, phase: number, ratchet: number) {
        super(a, b);

        this.phase = phase;
        this.ratchet = ratchet;

        // STATIC_BODY_CHECK
        this.angle = (b ? b.a : 0) - (a ? a.a : 0);

        this.iSum = this.bias = this.jAcc = this.jMax = 0;
    }

    preStep(dt: number): void {
        const a = this.a;
        const b = this.b;

        const angle = this.angle;
        const phase = this.phase;
        const ratchet = this.ratchet;

        const delta = b.a - a.a;
        const diff = angle - delta;
        let pdist = 0;

        if (diff * ratchet > 0) {
            pdist = diff;
        } else {
            this.angle = Math.floor(
                (delta - phase) / ratchet,
            ) * ratchet + phase;
        }

        // calculate moment of inertia coefficient.
        this.iSum = 1 / (a.inertiaInv + b.inertiaInv);

        // calculate bias velocity
        const maxBias = this.maxBias;
        this.bias = clamp(
            -biasCoef(this.errorBias, dt) * pdist / dt,
            -maxBias, maxBias,
        );

        // compute max impulse
        this.jMax = this.maxForce * dt;

        // If the bias is 0, the joint is not at a limit. Reset the impulse.
        if (!this.bias) {
            this.jAcc = 0;
        }
    }

    applyCachedImpulse(dtCoef: number): void {
        const a = this.a;
        const b = this.b;

        const j = this.jAcc * dtCoef;
        a.w -= j * a.inertiaInv;
        b.w += j * b.inertiaInv;
    }

    applyImpulse(): void {
        if (!this.bias) {
            return; // early exit
        }

        const a = this.a;
        const b = this.b;

        // compute relative rotational velocity
        const wr = b.w - a.w;
        const ratchet = this.ratchet;

        // compute normal impulse
        let j = -(this.bias + wr) * this.iSum;
        const jOld = this.jAcc;
        this.jAcc = clamp(
            (jOld + j) * ratchet,
            0, this.jMax * Math.abs(ratchet)) / ratchet;
        j = this.jAcc - jOld;

        // apply impulse
        a.w -= j * a.inertiaInv;
        b.w += j * b.inertiaInv;
    }

    getImpulse(): number {
        return Math.abs(this.jAcc);
    }
}
