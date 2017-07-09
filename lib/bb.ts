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

/// Chipmunk's axis-aligned 2D bounding box type along with a few handy routines.

let numBB = 0;

// Bounding boxes are JS objects with {l, b, r, t} = left, bottom, right, top, respectively.
export class BB {
    l: number;
    b: number;
    r: number;
    t: number;

    constructor(l, b, r, t) {
        this.l = l;
        this.b = b;
        this.r = r;
        this.t = t;

        numBB++;
    }
}

export function bb(l, b, r, t) {
    return new BB(l, b, r, t);
}

export function bbNewForCircle({ x, y }, r) {
    return new BB(
        x - r,
        y - r,
        x + r,
        y + r
    );
};

/// Returns true if @c a and @c b intersect.
export function bbIntersects(a, b) {
    return (a.l <= b.r && b.l <= a.r && a.b <= b.t && b.b <= a.t);
};
export function bbIntersects2(bb, l, b, r, t) {
    return (bb.l <= r && l <= bb.r && bb.b <= t && b <= bb.t);
};

/// Returns true if @c other lies completely within @c bb.
export function bbContainsBB(bb, other) {
    return (
        bb.l <= other.l &&
        bb.r >= other.r &&
        bb.b <= other.b &&
        bb.t >= other.t
    );
};

/// Returns true if @c bb contains @c v.
export function bbContainsVect(bb, v) {
	return (bb.l <= v.x && bb.r >= v.x && bb.b <= v.y && bb.t >= v.y);
};

export function bbContainsVect2(l, b, r, t, v) {
	return (l <= v.x && r >= v.x && b <= v.y && t >= v.y);
};

/// Returns a bounding box that holds both bounding boxes.
export function bbMerge(a, b) {
    return new BB(
        Math.min(a.l, b.l),
        Math.min(a.b, b.b),
        Math.max(a.r, b.r),
        Math.max(a.t, b.t)
    );
};

/// Returns a bounding box that holds both @c bb and @c v.
export function bbExpand(bb, v){
	return new BB(
        Math.min(bb.l, v.x),
        Math.min(bb.b, v.y),
        Math.max(bb.r, v.x),
        Math.max(bb.t, v.y)
    );
};

/// Returns the area of the bounding box.
export function bbArea(bb) {
    return (bb.r - bb.l) * (bb.t - bb.b);
};

/// Merges @c a and @c b and returns the area of the merged bounding box.
export function bbMergedArea(a, b) {
    return (
        (Math.max(a.r, b.r) - Math.min(a.l, b.l)) *
        (Math.max(a.t, b.t) - Math.min(a.b, b.b))
    );
};

export function bbMergedArea2(bb, l, b, r, t) {
    return (
        (Math.max(bb.r, r) - Math.min(bb.l, l)) *
        (Math.max(bb.t, t) - Math.min(bb.b, b))
    );
};

/// Return true if the bounding box intersects the line segment with ends @c a and @c b.
export function bbIntersectsSegment(bb, a, b) {
    return (bbSegmentQuery(bb, a, b) != Infinity);
};

/// Clamp a vector to a bounding box.
export function bbClampVect(bb, v) {
	const x = Math.min(Math.max(bb.l, v.x), bb.r);
	const y = Math.min(Math.max(bb.b, v.y), bb.t);
	return new Vect(x, y);
};

// TODO edge case issue
/// Wrap a vector to a bounding box.
export function bbWrapVect({ r, l, t, b }, v) {
    const ix = Math.abs(r - l);
    const modx = (v.x - l) % ix;
    const x = (modx > 0) ? modx : modx + ix;

    const iy = Math.abs(t - b);
    const mody = (v.y - b) % iy;
    const y = (mody > 0) ? mody : mody + iy;

    return new Vect(x + l, y + b);
};
