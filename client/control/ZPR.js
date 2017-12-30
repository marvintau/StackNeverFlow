var Vector = require('../model/Vector.js');

/**
 * Zoom, Pan and Rotate
 */
class ZPR {
	
	constructor(){
		this.zoom = 1;
		this.pan = new Vector(0, 0);
	}

	/**
	 * for transforming model to screen point
	 * @param {[type]} vec [description]
	 */
	Transform(vec){
		return vec.Sub(this.pan).Mult(this.zoom).Add(this.pan);
	}

	/**
	 * for transforming screen point to model
	 * @param {[type]} vec [description]
	 */
	InvTransform(vec){
		return vec.Sub(this.pan).Mult(1/this.zoom).Add(this.pan);
	}

	/**
	 * for doing zpr operation with mouse event
	 * @param  {[type]} mouseScreenVec [description]
	 * @return {[type]}                [description]
	 */
	Zoom(mouseScreenVec, zoomInc){
		var newZoom = (this.zoom >= 3 && zoomInc > 0) ? 1 : (this.zoom <= 0.6 && zoomInc < 0) ? 1 : 1 + zoomInc;
		this.zoom *= newZoom;
		this.pan = mouseScreenVec.Mult(newZoom);
	}

	Save(){
		this.hist = this.pan.Copy();
	}
}

module.exports = ZPR;