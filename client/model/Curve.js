var Outline = require('./Outline.js');
var Vector  = require('./Vector.js');
var Lever   = require('./Lever.js');

var CurveMath = require('../math/CurveMath.js');

class Curve {

    constructor(input){

        if(input != undefined){
            this.levers = input.levers.map(function(lever){return new Lever(lever)});
            this.outline = new Outline(input.outline);
        } else {
            this.levers = [];
            this.outline = new Outline();            
        }

    }

    Add(mouseV){
        this.levers.push(new Lever(mouseV));
        // this.GetOutlines();
        return this.levers.length - 1;
    }

    Delete(index){
        levers.splice(index, 1);
        this.GetOutlines();
    }
    
    Insert(curveCast) {
        this.levers.splice(Math.floor(curveCast+1), 0, new Lever(new Vector(0, 0)));
        CurveMath.SetInsertedLeverOnCurveGroup(this.levers, Math.floor(curveCast+1), curveCast - Math.floor(curveCast));
        console.log(this.levers.length);

        this.GetOutlines();
        
        return Math.floor(curveCast+1);
    }

    UpdateLever(ithLever, ithPoint, value){
        this.levers[ithLever].SetControlPoint(ithPoint, value);
        this.outline.GetOutline(this.levers);
    }

    GetOutlines(){
        this.outline.GetOutline(this.levers);
    }


    ExtractArray(){
    	var res = [];
        for(var lever of this.levers) res.push(lever.ExtractArray());
        return res;
    }

    TransFromArray(array, increment) {
    	// console.log(array);
        for (var i = 0; i < this.levers.length; i++) {
            this.levers[i].TransFromArray(array[i], increment);
        }
        this.GetOutlines();
    }
}

module.exports = Curve;