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

import { assert, closestPointOnSegment } from '../util'
import {
    Vect, vzero,
    vadd, vsub,
    vmult, vcross, vdot,
    vdist, vlength2,
    vlerp, vnormalize,
    vneg, vperp, vrotate,
} from '../vect';

import { Body } from '../body';
import { BB } from '../bb';
import { Space } from '../space';
import { Shape, NearestPointQueryInfo, SegmentQueryInfo } from './base';
import { circleSegmentQuery } from './util';


export class SegmentShape extends Shape {
    a: Vect;
    b: Vect;
    n: Vect;

    // TODO
    ta: Vect;
    tb: Vect;
    tn: Vect;

    r: number;

    a_tangent: Vect;
    b_tangent: Vect;

    constructor(body: Body, a: Vect, b: Vect, r: number) {
        super(body);

        this.a = a;
        this.b = b;
        this.n = vperp(vnormalize(vsub(b, a)));

        this.ta = this.tb = this.tn = null;

        this.r = r;

        this.a_tangent = vzero;
        this.b_tangent = vzero;

        this.type = 'segment';
    }

    cacheData(p: Vect, rot: Vect): void {
        this.ta = vadd(p, vrotate(this.a, rot));
        this.tb = vadd(p, vrotate(this.b, rot));
        this.tn = vrotate(this.n, rot);

        let l;
        let r;
        let b;
        let t;

        if (this.ta.x < this.tb.x) {
            l = this.ta.x;
            r = this.tb.x;
        } else {
            l = this.tb.x;
            r = this.ta.x;
        }

        if (this.ta.y < this.tb.y) {
            b = this.ta.y;
            t = this.tb.y;
        } else {
            b = this.tb.y;
            t = this.ta.y;
        }

        const rad = this.r;

        this.bb_l = l - rad;
        this.bb_b = b - rad;
        this.bb_r = r + rad;
        this.bb_t = t + rad;
    }

    nearestPointQuery(p: Vect): NearestPointQueryInfo {
        const closest = closestPointOnSegment(p, this.ta, this.tb);

        const deltax = p.x - closest.x;
        const deltay = p.y - closest.y;
        const d = vlength2(deltax, deltay);
        const r = this.r;

        const nearestp = (d ? vadd(closest, vmult(new Vect(deltax, deltay), r / d)) : closest);
        return new NearestPointQueryInfo(this, nearestp, d - r);
    }

    segmentQuery(a: Vect, b: Vect): SegmentQueryInfo {
        const n = this.tn;
        const d = vdot(vsub(this.ta, a), n);
        const r = this.r;

        const flipped_n = (d > 0 ? vneg(n) : n);
        const n_offset = vsub(vmult(flipped_n, r), a);

        const seg_a = vadd(this.ta, n_offset);
        const seg_b = vadd(this.tb, n_offset);
        const delta = vsub(b, a);

        if (vcross(delta, seg_a) * vcross(delta, seg_b) <= 0) {
            const d_offset = d + (d > 0 ? -r : r);
            const ad = -d_offset;
            const bd = vdot(delta, n) - d_offset;

            if (ad * bd < 0) {
                return new SegmentQueryInfo(this, ad / (ad - bd), flipped_n);
            }
        } else if (r !== 0) {
            const info1 = circleSegmentQuery(this, this.ta, this.r, a, b);
            const info2 = circleSegmentQuery(this, this.tb, this.r, a, b);

            if (info1) {
                return info2 && info2.t < info1.t ? info2 : info1;
            } else {
                return info2;
            }
        }
    }

    setNeighbors(prev, next) {
        this.a_tangent = vsub(prev, this.a);
        this.b_tangent = vsub(next, this.b);
    }

    setEndpoints(a, b) {
        this.a = a;
        this.b = b;
        this.n = vperp(vnormalize(vsub(b, a)));
    }
}
