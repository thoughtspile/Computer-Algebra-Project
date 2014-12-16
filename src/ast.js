// AST

// generic AST constructor
function ASTfactory() {
	// associated node classes are stored by id.
	this.classes = {};
}

// ugly [!!!] node class adding.
ASTfactory.prototype.addNodeClass = function(id, feval, texify) {
	// constructor
	var nodeClass = function(selfValue) {
		AST.call(this, selfValue);
		this.type = id;
	}
	// inherit from AST
	nodeClass.prototype = new AST();
	
	// [!!!] replace these three with a generic traversal.
	
	// get computed numeric value
	nodeClass.prototype.value = function() {
		// memoize _value
		this._value = this._value || feval(this.selfValue, this.children.map(function(child) {
			return child.value();
		}));
		return this._value;
	};
	
	// get TeX code
	nodeClass.prototype.texify = function() {
		// memoize _tex
		if (!isExisty(this._tex)) {
			this._tex = texify(this.selfValue, this.children.map(function(child) {
				return child.texify(false);
			}), this.children.map(function(child) {
				return child.type;
			}));
		}
		return this._tex;
	};
	
	// get tikz tree
	nodeClass.prototype.tikzify = function(indent) {
		// with proper indentation!
		if (!isExisty(indent)) indent = '';
		if (!isExisty(this._tikz)) {
			this._tikz = indent + 'node{' + this.selfValue + '}\n' +
				this.children.map(function(child) {
					return indent + '  child{\n' + child.tikzify(indent + '    ') + indent + '  }';
				}).join('\n');
		}
		return this._tikz;
	};
	
	// store constructor by id.
	this.classes[id] = nodeClass;
	
	return this;
};
	
// prototype for generic AST node
function AST(selfValue) {
	// string value
	this.selfValue = selfValue;
	this.children = [];
	
	// memos
	this._value = null;
	this._tex = null;
	this._tikz = null;
	this._memos = {};
};
	
// generic map w/callback
AST.prototype.flush = function(traverser) {
	this._value = null;
	this._tex = null;
	this._tikz = null;
	this._memos = {};
	return this;
};

AST.prototype.clone = function() {
	var temp = new this.constructor(this.selfValue);
	return temp;
};
