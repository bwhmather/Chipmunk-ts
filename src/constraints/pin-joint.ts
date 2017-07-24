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
import { assertSoft, clamp } from "../util";
import {
    vadd,
    Vect, vlength,
    vmult,
    vrotate,
    vsub,
} from "../vect";
import { Constraint } from "./constraint";
import {
    apply_impulses,
    bias_coef,
    k_scalar, normal_relative_velocity,
} from "./util";

export class PinJoint extends Constraint {
    anchr1: Vect;
    anchr2: Vect;

    p1: Vect;
    p2: Vect;

    dist: number;
    r1: Vect;
    r2: Vect;

    n: Vect;
    nMass: number;
    jnAcc: number;
    jnMax: number;
    bias: number;

    constructor(a: Body, b: Body, anchr1: Vect, anchr2: Vect) {
        super(a, b);

        this.anchr1 = anchr1;
        this.anchr2 = anchr2;

        // STATIC_BODY_CHECK
        const p1 = (a ? vadd(a.p, vrotate(anchr1, a.rot)) : anchr1);
        const p2 = (b ? vadd(b.p, vrotate(anchr2, b.rot)) : anchr2);
        this.dist = vlength(vsub(p2, p1));

        assertSoft(
            this.dist > 0,
            "You created a 0 length pin joint. A pivot joint will be much " +
            "more stable.",
        );

        this.r1 = this.r2 = null;
        this.n = null;
        this.nMass = 0;

        this.jnAcc = this.jnMax = 0;
        this.bias = 0;
    }

    preStep(dt: number): void {
        const a = this.a;
        const b = this.b;

        this.r1 = vrotate(this.anchr1, a.rot);
        this.r2 = vrotate(this.anchr2, b.rot);

        const delta = vsub(vadd(b.p, this.r2), vadd(a.p, this.r1));
        const dist = vlength(delta);
        this.n = vmult(delta, 1 / (dist ? dist : Infinity));

        // calculate mass normal
        this.nMass = 1 / k_scalar(a, b, this.r1, this.r2, this.n);

        // calculate bias velocity
        const maxBias = this.maxBias;
        this.bias = clamp(
            -bias_coef(this.errorBias, dt) * (dist - this.dist) / dt,
            -maxBias, maxBias,
        );

        // compute max impulse
        this.jnMax = this.maxForce * dt;
    }

    applyCachedImpulse(dtCoef: number): void {
        const j = vmult(this.n, this.jnAcc * dtCoef);
        apply_impulses(this.a, this.b, this.r1, this.r2, j.x, j.y);
    }

    applyImpulse(): void {
        const a = this.a;
        const b = this.b;
        const n = this.n;

        // compute relative velocity
        const vrn = normal_relative_velocity(a, b, this.r1, this.r2, n);

        // compute normal impulse
        let jn = (this.bias - vrn) * this.nMass;
        const jnOld = this.jnAcc;
        this.jnAcc = clamp(jnOld + jn, -this.jnMax, this.jnMax);
        jn = this.jnAcc - jnOld;

        // apply impulse
        apply_impulses(a, b, this.r1, this.r2, n.x * jn, n.y * jn);
    }

    getImpulse(): number {
        return Math.abs(this.jnAcc);
    }
}
