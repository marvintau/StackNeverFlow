
var Vector =  require('./model/Vector.js');
var Lever =   require('./model/Lever.js');
var Curve =   require('./model/Curve.js');
var Outline = require('./model/Outline.js');

var Cast =   require('./control/Cast.js');
var Draw =   require('./control/Draw.js');
var ZPR =    require('./control/ZPR.js');


class Param{
 	constructor(name, value, min, max){
		this.name = name;
		this.value = value;
		this.min = min;
		this.max = max;
	}
}

var Status = Object.freeze({
		Editing : 0,
		Creating : 1,
		MovingCurve : 2,
		MovingLever : 3,
		EditingLever : 4
	});

class Document{
	constructor(canvas){
		this.canvas = canvas;
		this.curves = [];

		this.params = {};
		this.init = "";
		this.update = "";

		this.status = Status.Editing;
		this.isTranslatingLever = false;
		this.isEditingLever = false;

		this.currCurveIndex = null,
		this.currLeverIndex = null,
		this.currPoint = null;

		this.zpr = new ZPR();
	}

	CurrCurve(){
		return this.curves[this.currCurveIndex];
	}

	CurrLever(){
		return this.curves[this.currCurveIndex].levers[this.currLeverIndex];
	}

	AddCurve(curve){
		this.currCurveIndex = this.curves.push(curve) - 1;
	}

	AddPoint(point){
		if(this.currCurveIndex == null){
			this.AddCurve(new Curve(point));
		} else {
			if(this.SelectControlPoint(point, false) == -1){
				this.currLeverIndex = this.CurrCurve().Add(point);
				console.log(this.currLeverIndex);
			}
		}

		// otherwise the status will be switched to EditingLever.
		// watchout the side effect.

	}

	Deselect(){
		this.currCurveIndex = null,
		this.currLeverIndex = null,
		this.currPoint = null;
	}

	/**
	 * Once a casted control point of a lever found, set up current
	 * lever index and control point index, and set the status
	 * @param {[type]} point [description]
	 */
	SelectControlPoint(point, no_center){

		var cast = -1;
		if(this.currCurveIndex != null){

			for (const [i, lever] of this.CurrCurve().levers.entries()){
				cast = Cast.Lever(lever, point);
				if(cast != -1 && cast != (no_center ? 2 : -1)){
					this.currLeverIndex = i;
					this.currPoint = cast;
					this.status = Status.EditingLever;
					break;
				}
			}
		}

		return cast;
	}

	PrepareLeverTrans(ith, point){
		var transArray = [];
		var curve = this.curves[ith];

		for (const [i, lever] of this.CurrCurve().levers.entries()){
			var cast = Cast.Lever(lever, point);
			if(cast != -1){
				this.currLeverIndex = i;
				this.currPoint = cast;
				this.status = Status.MovingLever;
				transArray = this.CurrLever().ExtractArray();
				break;
			}
		}

		return transArray;

	}

	PrepareTrans(point){
		var transArray = [];
		for (const [ith, curve] of this.curves.entries()){
			if(Cast.Curve(curve, point) != -1) {
				this.currCurveIndex = ith;
				transArray = this.PrepareLeverTrans(ith, point);
				if(transArray.length == 0){
					this.status = Status.MovingCurve;
					transArray = this.CurrCurve().ExtractArray();
				}
				break;
			}
		}
		return transArray;
	}

	UpdateEdit(curr, orig, transArray){

		switch(this.status){
			case Status.Creating:
				this.CurrCurve().UpdateLever(this.currLeverIndex, 4, curr);
				break;
			case Status.MovingCurve:
				this.CurrCurve().TransFromArray(transArray, curr.Sub(orig));
				break;
			case Status.MovingLever:
				this.CurrLever().TransFromArray(transArray, curr.Sub(orig));
	            this.CurrCurve().UpdateOutlines();
	            break;
			case Status.EditingLever:
				console.log(this.currPoint);
				this.CurrCurve().UpdateLever(this.currLeverIndex, this.currPoint, curr);
				break;

		}
	}

	FinishEdit(){
		if(this.status != Status.Editing && this.status != Status.Creating){
			this.status = Status.Editing;
		}
	}

	InitEval(){
		this.dstack = [];
		this.consts = {};
		this.vars  = {};
	}

	ClearEval(){
		delete this.dstack;
		delete this.consts;
		delete this.vars;
	}

	UpdateDraw(context){
		for(let curve of this.curves){
			curve.UpdateOutlines();
		}
		Draw.Curves(context, this);
	}

	Eval(expr){
		var text = expr.split('\n'),
			exec_hold_flag = false,
			exec_err_flag = false;

		var hold = function(){
			exec_hold_flag = true;
		}

		var unhold = function(){
			exec_hold_flag = false;
		}

		var pop = function(){
			return this.dstack.pop();
		}.bind(this);

		var push = function(elem){
			this.dstack.push(elem);
			// console.log(JSON.stringify(dstack));
		}.bind(this);

		var refer = function(){
			var name = pop();
			var xhr = new XMLHttpRequest();
			xhr.open('GET', 'load/'+name);
			xhr.onload = function() {
				if (xhr.status === 200) {
					var res = JSON.parse(xhr.responseText);
					push(LoadData.Curves(res.curves));

				}
				else {
					console.log('Request failed.  Returned status of ' + xhr.status);
					exec_err_flag = true;
				}
			};
			xhr.send();
		};

		var put = function(){
			var key = pop();
			var val = pop();
			this.consts[key] = val.Copy();
			console.log(key);
			console.log(key.toString() + " " + JSON.stringify(this.consts[key]));
		}.bind(this);

		var put_var = function(){
			var key = pop();
			var val = pop();
			this.vars[key] = val.Copy();
			console.log(key);
			console.log(key.toString() + " " + JSON.stringify(this.consts[key]));
		}.bind(this);

		var get = function(){
			var key = pop();
			var res = this.consts[key];
			if(res == undefined){
				console.log('key "'+ key +'" not found');
				exec_err_flag = true;
			} else
				push(res);
		}.bind(this);

		var vec = function(){
			var x = pop();
			var y = pop();
			push(new Vector(parseFloat(x), parseFloat(y)));
		}

		var set = function(){
			var first = pop();
			var second;
			if(first == "c" || first == "curve"){
				second = parseInt(pop());
				this.curves[second] = pop();
			} else if (first == "l" || first == "lever") {
				second = parseInt(pop());
				var third = pop();
				if(third == "c" || third == "curve"){
					var fourth = parseInt(pop());
					var fifth = pop();
					this.curves[fourth].levers[second] = fifth;
				}
			} else if (first == "p") {
				second = parseInt(pop());
				var third = pop();
				if(third == "l" || third == "curve"){
					var fourth = parseInt(pop());
					var fifth = pop();
					if(fifth == "c" || fifth == "curve"){
						var sixth = parseInt(pop());
						this.curves[sixth].levers[fourth].SetControlPoint(second, pop());
					}
				}
			}
		}.bind(this);

		var float = function(){
			var p = pop();
			push(parseFloat(p));
		}

		var plus = function(){
			var p1 = pop();
			var p2 = pop();

			if(typeof p1 == "number" && typeof p2 == "number")
				push(p1 + p2);
			else if(typeof p1.x == "number" && typeof p2.x == "number")
				push(p1.Add(p2));
			else{
				console.log("plus type error");
				exec_err_flag = true;
			}
		}

		var subt = function(){
			var p1 = pop();
			var p2 = pop();

			if(typeof p1 == "number" && typeof p2 == "number")
				push(p1 - p2);
			else if(typeof p1.x == "number" && typeof p2.x == "number")
				push(p1.Sub(p2));
			else{
				console.log("sub type error: " + typeof p1 + " " + p2 + " " + typeof p2 );
				exec_err_flag = true;
			}
		}

		var mult = function(){
			var p = pop();
			var n  = pop();
			if(typeof p == "number" && typeof n == "number")
				push(n * p);
			else if(typeof p.x == "number" && typeof n == "number")
				push(p.Mult(n));
			else{
				console.log("mult type error: " + typeof p + " " + typeof n);
				exec_err_flag = true;
			}
		}

		var dist = function(){
			var p1 = pop();
			var p2 = pop();
			push(p1.Dist(p2));
		}

		var trans = function(){
			var elem = pop(),
				increm = pop();
				console.log(increm);
			push(elem.TransCreate(increm));
		}

		var sin = function(){
			var elem = pop();
			push(Math.sin(elem / 180 * Math.PI));
		}

		var cos = function(){
			var elem = pop();
			push(Math.cos(elem / 180 * Math.PI));
		}

		var tan = function(){
			var elem = pop();
			push(Math.tan(elem / 180*Math.PI));
		}

		var mag = function(){
			var elem = pop();
			push(elem.Dist());
		}

		var norm = function(){
			var elem = pop();
			push(elem.Mult(1/elem.Mag()));
		}

		var rotate = function(){
			var angle = pop(),
				rad   = angle / 180.0 * Math.PI;
			var about = pop();
			var dest  = pop();

			var newVec = dest.Sub(about);
			newVec.x = Math.cos(rad) * newVec.x - Math.sin(rad) * newVec.y;
			newVec.y = Math.sin(rad) * newVec.x + Math.cos(rad) * newVec.y;


			push(newVec.Add(about));
		}

		var curve = function(){
			var ith = parseInt(pop());
			push(this.curves[ith]);
		}.bind(this);

		var lever = function(){
			var ith = parseInt(pop());
			var elem = pop();
			if(elem.levers != undefined)
				push(elem.levers[ith]);
			else{
				console.log("lever needs a curve ref ahead");
				exec_err_flag = true;
			}
		}

		var point = function(){
			var ith = parseInt(pop());
			var elem = pop();
			if(elem.points != undefined)
				push(elem.points[ith]);
			else{
				console.log("point needs a lever ref ahead");
				exec_err_flag = true;
			}
		}

		var param = function(){
			var name = pop();
			var byName = this.params[name]
			if(byName != undefined){
				push(parseFloat(byName.value));
			} else {
				console.log("param name "+name+" not found");
				exec_err_flag = true;
			}
		}.bind(this);

		var curr;
		var stack;

		for (var i = 0; i < text.length; i++) {
			stack = text[i].split(" ");
			while(true){
				curr = stack.pop();
				if(exec_hold_flag && curr != "unhold"){
					push(curr);
				} else {
					switch(curr){
						case "sin"	 : sin();       break;
						case "cos"   : cos();       break;
						case "tan"   : tan();       break;
						case "float" : float();		break;
						case "mag"	 : mag();   	break;
						case "dist"  : dist();      break;
						case "rotate":
						case "rot"   : rotate();	break;
						case "hold"	 : hold();		break;
						case "unhold": unhold();	break;
						case "set"   : set();		break;
						case "vec"   : vec();		break;
						case "get"   : get();		break;
						case "put"   : put();		break;
						case "var"   : put_var();   break;  
						case "c":	
						case "curve" : curve();		break;
						case "l":	
						case "lever" : lever();		break;
						case "p":	
						case "point" : point();		break;
						case "plus"  : plus();		break;
						case "sub"   : subt();		break;
						case "mult"  : mult();		break;
						case "trans" : trans();		break;
						case "param" : param();		break;
						default	:
							if(curr[0] == "@") {
								push(parseFloat(this.params[curr.slice(1)].value));
							} else if(curr[0] == "."){
								if(this.consts[curr.slice(1)] != undefined){
									push(this.consts[curr.slice(1)]);
								}
								if(this.vars[curr.slice(1)] != undefined){
									push(this.vars[curr.slice(1)]);
								}
							} else {
								if(curr != "") push(curr);
							}
					}
				}
				if(stack.length == 0) break;
				if(exec_err_flag) {
					console.log("at "+curr);
					break;
				}
				// console.log(JSON.stringify(this.consts));
			}
			if(exec_err_flag){
				console.log("error raised, further Eval stopped");
				console.log(text[i]);
				break;
			}
		}
		this.vars={};
	}
	
}

module.exports = Document;