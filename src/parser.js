var parser = (function() {
	function isExisty(obj) {
		return typeof(obj) !== 'undefined' && obj !== null;
	};

	function ASDAG(str) {
		return {
			from: str
		};
	}
	
	ASDAG.create = function(str) {
		if (!isExisty(ASDAG.memo[str]))
			return ASDAG.memo[str] = new ASDAG(str);
		return ASDAG.memo[str];
	};
	
	ASDAG.nodeClasses = {
		'value': 'VAL',
		'operator': 'OP'
	};
	
	ASDAG.memo = {
	};
	
	function normalize(str) {
		return str.replace(/ /g, '');
	}
	
	var regex = {
		op: /^[+-/*]/,
		//alphanum: /^[A-Za-z_$0-9.]/,
		literal: /^[A-Za-z_$0-9.]+/,
		//uminus: /^(?:[+-/*])-/,
		lparen: /^[(]/,
		separator: /^[,;]/,
		rparen: /^[)]/,
		space: /^\s+/
	};
	
	function getNextToken(str) {
		var token = {};
		Object.getOwnPropertyNames(regex).forEach(function(name) {
			var match = str.match(regex[name]);
			if (isExisty(match)) {
				token.type = name;
				token.lexeme = match[0];
			}
		});
		return token;
	};
	
	function tokenize(str) {
		var tokens = [];
			
		while (str.length !== 0) {
			var token = getNextToken(str);
			if (token.type !== 'space')
				tokens.push(token);
			str = str.substr(token.lexeme.length);
		}
		
		return tokens;
	}
	
	function parse(str) {
		return tokenize(str);
		//return ASDAG.create(normalize(str));
	}

	return {
		parse: parse
	}
}());