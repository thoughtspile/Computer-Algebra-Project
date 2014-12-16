// utils

// cotangent polyfill
Math.cot = function(x) {
	return 1 / Math.tan(x);
};
	
// not undefined, not null
function isExisty(obj) {
	return typeof(obj) !== 'undefined' && obj !== null;
};

function ParseError(message, position) {
	this.name = 'ParseError';
	this.message = message || '';
	this.position = position || 0;
}
ParseError.prototype = new Error();
ParseError.prototype.constructor = ParseError;