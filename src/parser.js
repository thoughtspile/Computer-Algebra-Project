var parser = (function() {
	// utils
	
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
	
	// parser
	
	var terminalRegex = /^[a-z0-9_$]+$/;
	
	function Parser() {
		this.table = {};
	}
	
	Parser.prototype.isTerminal = function(token) {
		return !this.table.hasOwnProperty(token);
	};
			
	Parser.prototype.addRule = function(left, right, node) {
		var tail = right.slice(),
			prefix = null;
			
		if(tail.length !== 0 && terminalRegex.test(tail[0]))
			prefix = tail.shift();
		
		this.table[left] = this.table[left] || {};
		this.table[left][prefix] = {add: tail, node: node};
		
		return this;
	};
		
	Parser.prototype.run = function(tokenList, expect, expr) {
		if (!isExisty(expect)) {
			tokenList = tokenList.slice();
			
			var root = this.run(tokenList, 'EXPR');
			
			if (tokenList[0].type !== '$') {
				throw new ParseError('End not reached', tokenList[0].start);
			}				
			tokenList.pop();
			
			return root;
		} else {
			var lookahead = tokenList[0];
			if (this.isTerminal(expect)) {
				if (lookahead.type === expect) {
					tokenList.shift();
				} else {
					throw new ParseError('Expected token ' + expect + ' got ' + lookahead.type, lookahead.start);
				}
			} else {
				var stateRules = this.table[expect],
					rule = null,
					node = null;
				
				if (isExisty(stateRules[lookahead.type])) {
					rule = stateRules[lookahead.type].add;
					node = stateRules[lookahead.type].node;
					tokenList.shift();
				} else if (isExisty(stateRules[null])) {
					rule = stateRules[null].add;
					node = stateRules[null].node;
				} else {
					throw new ParseError('No matching rule', lookahead.start);
				}
				
				var ast = null;
				if (isExisty(node)) {
					ast = new node(lookahead.lexeme);
					if (isExisty(expr)) {
						expr.parent = ast;
						ast.children.push(expr);
					}
					
					// first match is the right child.
					// any following match overrides ast as current node
					
					var first = true,
						left = null;
					for (var i = 0; i < rule.length; i++) {
						var temp = this.run(tokenList, rule[i], left);
						if (isExisty(temp) && first) {
							ast.children.push(temp);
							temp.parent = ast;
							first = false;
							left = ast;
						} else if (isExisty(temp)) {
							ast = temp;
							left = ast;
						}
					}
				} else {
					ast = rule.reduce(function(pv, token) {
						var temp = this.run(tokenList, token, pv);
						return isExisty(temp)? temp: pv;
					}.bind(this), null);
				}
				return ast;	
			}
		}
	};

	
	function AST() {
		this.classes = {};
	}
	
	AST.prototype.addNodeClass = function(id, op) {
		var nodeConstructor = ASTnode.bind(null, op);
		this.classes[id] = nodeConstructor;
		return this;
	};
	
	function ASTnode(op, selfValue) {
		this.op = op;
		this.children = [];
		this.selfValue = selfValue;
		this._value = null;
	};
	
	ASTnode.prototype.value = function() {
		this._value = this._value || this.op(this.selfValue, this.children.map(function(node) {
			return node.value();
		}));
		return this._value;
	};
		
		
	// tokenizer
	function Tokenizer() {
		this.patterns = {};
		this.tokenClasses = [];
		this.pos = 0;
		
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
				token.start = this.pos;
			}
		}.bind(this));
		return token;
	};
	
	Tokenizer.prototype.run = function(str) {
		var tokens = [];
		this.pos = 0;
			
		while (str.length !== 0) {
			var token = this.getNextToken(str);
			if (token.type == 'error')
				throw new ParseError('Tokenization fail: ' + token.lexeme, token.start);
			else if (token.type !== 'space')
				tokens.push(token);
			str = str.substr(token.lexeme.length);
			this.pos += token.lexeme.length;
		}
		
		tokens.push({type: '$', lexeme: ''});
		
		console.log('lexer out:', tokens);		
		return tokens;
	}
	
	
	// configure
	
	var trigTokenizer = new Tokenizer()
			.addPattern('plusminus', /^[+-]/)
			.addPattern('exp', /^\^/)
			.addPattern('multdiv', /^[*/]/)
			.addPattern('number', /^[0-9]*\.[0-9]+|^[0-9]+/)
			.addPattern('variable', /^[A-Za-z_$]+[A_Za-z_$0-9]*/)
			.addPattern('func', /^sin|^cos|^tan|^cot/i)
			.addPattern('constant', /^pi/i)
			.addPattern('lparen', /^\(/)
			.addPattern('rparen', /^\)/)
			.addPattern('space', /^\s+/, {ignore: true}),
		trigTree = new AST()
			.addNodeClass('number', function(self) {
				return parseFloat(self);
			})
			.addNodeClass('variable', function(self) {
				return self;
			})
			.addNodeClass('call', function(self, children) {
				return Math[self.toLowerCase()](children[0]);
			})
			.addNodeClass('sum', function(self, children) {
				if (self === '+')
					return children[0] + children[1];
				else
					return children[0] - children[1];
			})
			.addNodeClass('times', function(self, children) {
				if (self === '*')
					return children[0] * children[1];
				else 
					return children[0] / children[1];
			})
			.addNodeClass('unary', function(self, children) {
				if (self === '+')
					return children[0];
				else
					return -children[0];
			})
			.addNodeClass('pow', function(self, children) {
				return Math.pow(children[0], children[1]);
			})
			.addNodeClass('constant', function(self) {
				return Math[self.toUpperCase()];
			}),
		trigParser = new Parser()
			.addRule('EXPR', ['TERM', 'EXPR_TAIL'])  
			.addRule('EXPR_TAIL', ['plusminus', 'TERM', 'EXPR_TAIL'], trigTree.classes.sum)
			.addRule('EXPR_TAIL', [])  
			.addRule('TERM', ['plusminus', 'TERM'], trigTree.classes.unary)
			.addRule('TERM', ['FACTOR', 'TERM_TAIL'])
			.addRule('TERM_TAIL', ['multdiv', 'FACTOR', 'TERM_TAIL'], trigTree.classes.times)
			.addRule('TERM_TAIL', [])
			.addRule('FACTOR', ['plusminus', 'FACTOR'], trigTree.classes.unary)
			.addRule('FACTOR', ['ARG', 'FACTOR_TAIL'])
			.addRule('FACTOR_TAIL', ['exp', 'ARG', 'FACTOR_TAIL'], trigTree.classes.pow)
			.addRule('FACTOR_TAIL', [])
			.addRule('ARG', ['constant'], trigTree.classes.constant)
			.addRule('ARG', ['plusminus', 'ARG'], trigTree.classes.unary)
			.addRule('ARG', ['variable'], trigTree.classes.variable)
			.addRule('ARG', ['number'], trigTree.classes.number)
			.addRule('ARG', ['func', 'ARG'], trigTree.classes.call)
			.addRule('ARG', ['lparen', 'EXPR', 'rparen']),
		parse = function(str) {
			return trigParser.run(trigTokenizer.run(str));
		};
	
	// export

	return {
		parse: parse
	}
}());