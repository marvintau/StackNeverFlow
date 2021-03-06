var Vector = require("./Vector.js");

var LeverMode = Object.freeze({
    BROKEN		: 0,
    LINEAR 		: 2,
    PROPER 		: 3,
    SYMMETRIC	: 4
});

var StrokeMode = Object.freeze({
    FREE : 0,
    PERP : 1
})

var SelectMode = Object.freeze({
	NONE 		 : 0,
	LEVER_SELECT : 1
});

var LeverPoint = Object.freeze({
	POINT 		 : 2,
	CONTROL_1	 : 0,
	CONTROL_2 	 : 4,
	WIDTH_1 	 : 1,
	WIDTH_2	 	 : 3
});

class Lever {

	constructor(input){

        if(input != undefined){

            if(input.points != undefined){
                this.points     = input.points.map(function(point){return new Vector(point)});    
            }
            if(input.point != undefined){
                this.points = [
                    new Vector(input.point),
                    new Vector(input.point),
                    new Vector(input.point),
                    new Vector(input.point),
                    new Vector(input.point)
                ]
            }

            this.leverMode = (input.leverMode != undefined) ? input.leverMode : LeverMode.SYMMETRIC;
            this.selectMode = (input.selectMode != undefined) ? input.selectMode : SelectMode.NONE;
            this.strokeMode = (input.strokeMode != undefined) ? input.strokeMode : StrokeMode.FREE;

        } else {
			this.points = [
				Vector.Zero,
				Vector.Zero,
				Vector.Zero,
				Vector.Zero,
				Vector.Zero
			]
		}
	}

    Copy(){
        var newLever = new Lever();
        for (var i = newLever.points.length - 1; i >= 0; i--) {
            newLever.points[i] = this.points[i].Copy();
        }
        newLever.leverMode = this.leverMode;
        newLever.selectMode = this.selectMode;
        newLever.strokeMode = this.strokeMode;

        return newLever;
    }

    OppoOf(ith){
    	return 4 - ith;
    }

    Ratio(ith) {
    	var ithSide  = this.points[2].Dist(this.points[ith]),
    		oppoSide = this.points[2].Dist(this.points[this.OppoOf(ith)]);
        return ithSide / oppoSide;
    }

    OppoNorm(newPoint) {
        return (this.points[2].Sub(newPoint)).Normalize();
    }

    SetOppo(ith, oppoNorm, newDistance) {
        this.points[this.OppoOf(ith)] = this.points[2].Add(oppoNorm.Mult(newDistance));
    }

    SetControlPoint(ith, newPoint) {
    	var ratioOppo = this.Ratio(this.OppoOf(ith));
    	var oppoNorm  = this.OppoNorm(newPoint);

    	var dist;
    	switch(this.leverMode){

            /// for symmetric case, ratio is overwritten as 1
    		case LeverMode.SYMMETRIC:
    			ratioOppo = 1;

            /// recalculate to make proportional lever, the distance
            /// is calculated from the new distance between origin
            /// and currently selected control point.
	        case LeverMode.PROPER:
	            this.SetOppo(ith, oppoNorm, ratioOppo * this.points[2].Dist(newPoint));

            /// recalculate to make three points aligned on same
            /// line. use new direction and original distance of
            /// opposite control point.
	        case LeverMode.LINEAR:
	            this.SetOppo(ith, oppoNorm, this.points[2].Dist(this.points[this.OppoOf(ith)]));

            /// set new control point without affecting the oppo-
            /// site. The tangent will be broken.
     	   case LeverMode.BROKEN:
	            this.points[ith].Set(newPoint);

    	}
    }

    // ExtractArray and TransFromArray should be appear in Dragging handler,
    // to implement the real time update during dragging. When dragging around,
    // the lever should be always translated from same array (or point group)
    // until mouseup.

    ExtractArray(){
    	return [this.points[0].Copy(),
    			this.points[1].Copy(),
    			this.points[2].Copy(),
    			this.points[3].Copy(),
    			this.points[4].Copy()];
    }

    TransFromArray(points, inc){
    	this.points[0] = inc.Add(points[0]);
    	this.points[1] = inc.Add(points[1]);
    	this.points[2] = inc.Add(points[2]);
    	this.points[3] = inc.Add(points[3]);
    	this.points[4] = inc.Add(points[4]);
    }

    Trans(inc){
    	var array = this.ExtractArray();
    	this.TransFromArray(array, inc);
    }

    TransCreate(inc){
        var lever = this.Copy();
        lever.Trans(inc);
        return lever;
    }
}

module.exports = Lever;