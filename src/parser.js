var parser = (function() {
	// utils
	
	function isExisty(obj) {
		return typeof(obj) !== 'undefined' && obj !== null;
	};

	
	// parser
	
	var terminalRegex = /^[a-z0-9_$]+$/;
	
	function Parser() {
		this.table = {};
		this.states = [];
		this.rules = [];
	}
	
	Parser.prototype.isTerminal = function(token) {
		return this.states.indexOf(token) === -1;
	};
	
	Parser.prototype.computeTable = function() {
		this.rules.forEach(function(rule) {
			this.table[rule.state] = this.table[rule.state] || {};
			this.table[rule.state][rule.prefix] = rule.tail;
		}.bind(this));
		return this;
	};
		
	Parser.prototype.addRule = function(left, right) {
		var tail = right.slice(),
			prefix = null;
			
		if(tail.length !== 0 && terminalRegex.test(tail[0]))
			prefix = tail.shift();
			
		this.rules.push({state: left, prefix: prefix, tail: tail});
		this.states.push(left);
		
		return this;
	};
		
	Parser.prototype.run = function(tokenList) {
		tokenList = tokenList.slice();
		this.computeTable();
		
		var stack = ['$', 'EXPR'],
			lookahead = tokenList[0];
		while (stack.length !== 0) {
			var expect = stack.pop();
			
			if (this.isTerminal(expect)) {
				if (lookahead.type === expect) {
					tokenList.shift();
				} else {
					throw new Error('expected token ' + expect + ' got ' + lookahead.type);
				}
			} else {
				var stateRules = this.table[expect],
					rule = null;
				
				if (isExisty(stateRules[lookahead.type])) {
					rule = stateRules[lookahead.type];
					tokenList.shift();
				} else if (isExisty(stateRules[null])) {
					rule = stateRules[null];
				} else {
					throw new Error('no matching rule');
				}
				
				stack.push.apply(stack, rule.reverse());
				rule.reverse();
			}
			
			lookahead = tokenList[0];
		}
		
		if (tokenList.length !== 0)
			throw new Error('parsing failed');
		
		return 'success';
	};

	
	function ASTnode(type, lexeme, op) {
		this.type = type;
		this.op = op;
		this.selfValue = lexeme;
		this._value = null;
		this.children = [];
	};
	
	ASTnode.prototype.value = function() {
		this._value = this.op(this.selfValue, this.children.map(function(node) {
			return this.child.value();
		}));
		return this._value;
	};
		
		
	// tokenizer
	function Tokenizer() {
		this.patterns = {};
		this.tokenClasses = [];
		
		this.addPattern('error', /^.+/);
	}
	
	Tokenizer.prototype.addPattern = function(name, regex, opts) {
		this.patterns[name] = regex;
		this.tokenClasses.push(name);
		return this;
	};
	
	Tokenizer.prototype.getNextToken = function(str) {
		var token = {};
		this.tokenClasses.forEach(function(name) {
			var match = str.match(this.patterns[name]);
			if (isExisty(match)) {
				token.type = name;
				token.lexeme = match[0];
			}
		}.bind(this));
		return token;
	};
	
	Tokenizer.prototype.run = function(str) {
		var tokens = [];
			
		while (str.length !== 0) {
			var token = this.getNextToken(str);
			if (token.type == 'error')
				throw new Error('Tokenization fail: ' + token.lexeme);
			else if (token.type !== 'space')
				tokens.push(token);
			str = str.substr(token.lexeme.length);
		}
		
		tokens.push({type: '$', lexeme: ''});
		
		console.log(tokens);
		
		return tokens;
	}
	
	
	var trigTokenizer = new Tokenizer()
			.addPattern('plusminus', /^[+-]/)
			.addPattern('multdiv', /^[*/]/)
			.addPattern('literal', /^[A-Za-z_$]+[A_Za-z_$0-9]*|^[0-9]*.[0-9]+|^[0-9]+/)
			//.addPattern('constant', /^pi|^e/)
			.addPattern('func', /^sin|^cos|^tan|^cot/)
			.addPattern('lparen', /^[(]/)
			//.addPattern('separator', /^[;,]/)
			.addPattern('rparen', /^[)]/)
			.addPattern('space', /^\s+/, {ignore: true}),
		trigParser = new Parser()
			.addRule('EXPR', ['TERM', 'EXPR_TAIL'])  
			.addRule('EXPR_TAIL', ['plusminus', 'TERM', 'EXPR_TAIL'], {}) // add
			.addRule('EXPR_TAIL', [])  
			.addRule('TERM', ['plusminus', 'TERM'], {}) // unary
			.addRule('TERM', ['FACTOR', 'TERM_TAIL'])
			.addRule('TERM_TAIL', ['multdiv', 'FACTOR', 'TERM_TAIL'], {}) // mult
			.addRule('TERM_TAIL', [])
			.addRule('FACTOR', ['plusminus', 'FACTOR'], {}) // unary
			.addRule('FACTOR', ['ARG'])
			.addRule('ARG', ['literal'], {}) // value
			.addRule('ARG', ['func', 'ARG'], {}) // call site
			.addRule('ARG', ['lparen', 'EXPR', 'rparen']);
	
	var parse = function(str) {
		return trigParser.run(trigTokenizer.run(str));
	};
	
	// export

	return {
		parse: parse
	}
}());