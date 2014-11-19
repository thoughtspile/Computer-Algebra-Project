var parser = (function() {
	// utils
	
	Math.cot = function(x) {
		return 1 / Math.tan(x);
	};
	
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
		this.factory = null;
	}
	
	Parser.prototype.bindASTfactory = function(ASTfactory) {
		this.factory = ASTfactory;
		return this;
	};
	
	Parser.prototype.isTerminal = function(token) {
		return !this.table.hasOwnProperty(token);
	};
			
	Parser.prototype.addRule = function(left, right, nodeClassId) {
		var tail = right.slice(),
			prefix = null;
			
		if(tail.length !== 0 && terminalRegex.test(tail[0]))
			prefix = tail.shift();
		
		this.table[left] = this.table[left] || {};
		this.table[left][prefix] = {add: tail, node: this.factory.classes[nodeClassId]};
		
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

	
	// AST
	
	function ASTfactory() {
		this.classes = {};
	}
	
	ASTfactory.prototype.addNodeClass = function(id, feval, texify) {
		var nodeClass = function(selfValue) {
			AST.call(this, selfValue);
			this.type = id;
		}
		
		nodeClass.prototype = new AST();
		nodeClass.prototype.value = function() {
			this._value = this._value || feval(this.selfValue, this.children.map(function(child) {
				return child.value();
			}));
			return this._value;
		};
		nodeClass.prototype.texify = function() {
			if (!isExisty(this._tex)) {
				this._tex = texify(this.selfValue, this.children.map(function(child) {
					return child.texify(false);
				}), this.children.map(function(child) {
					return child.type;
				}));
			}
			return this._tex;
		};
		nodeClass.prototype.tikzify = function(indent) {
			if (!isExisty(indent)) indent = '';
			if (!isExisty(this._tikz)) {
				this._tikz = indent + 'node{' + this.selfValue + '}\n' + 
					this.children.map(function(child) {
						return indent + '  child{' + child.tikzify(indent + '  ') + indent + '  }';
					}).join('\n');
			}
			return this._tikz;
		};
		
		this.classes[id] = nodeClass;
		
		return this;
	};
	
	ASTfactory.prototype.create = function(id) {
		return new this.classes[id]();
	};
	
	function AST(selfValue) {
		this.selfValue = selfValue;
		this.children = [];
		
		this._value = null;
		this._tex = null;
		this._tikz = null;
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
		trigASTmaker = new ASTfactory()
			.addNodeClass('number', function(self, children) {
					return parseFloat(self);
				}, function(self, children, ctypes) {
					return self;
			})
			.addNodeClass('variable', function(self, children) {
					return self;
				}, function(self, children, ctypes) {
					return self;
			})
			.addNodeClass('call', function(self, children) {
					return Math[self.toLowerCase()](children[0]);
				}, function(self, children, ctypes) {
					return '\\' + self.toLowerCase() + '(' + children[0] + ')';
			})
			.addNodeClass('sum', function(self, children) {
					if (self === '+')
						return children[0] + children[1];
					else
						return children[0] - children[1];
				}, function(self, children, ctypes) {
					return children[0]  + self + children[1];
			})
			.addNodeClass('times', function(self, children) {
					if (self === '*')
						return children[0] * children[1];
					else 
						return children[0] / children[1];
				}, function(self, children, ctypes) {
					if (self === '*') {
						if (ctypes[0] === 'sum')
							children[0] = '\\left(' + children[0] + '\\right)';
						if (ctypes[1] === 'sum')
							children[1] = '\\left(' + children[1] + '\\right)';
						return children[0] + children[1];
					} else {
						return '\\frac{' + children[0] + '}{' + children[1] + '}';
					}
			})
			.addNodeClass('unary', function(self, children) {
					if (self === '+')
						return children[0];
					else
						return -children[0];
				}, function(self, children, ctypes) {
					var body = ctypes[0] === 'sum'? 
						'\\left(' + children[0] + '\\right)': 
						children[0]; 
					if (self === '+')
						return body;
					else
						return '-' + body;
			})
			.addNodeClass('pow', function(self, children) {
					return Math.pow(children[0], children[1]);
				}, function(self, children, ctypes) {
					return '(' + children[0] + ')' + selfValue + '(' + children[1] + ')';
			})
			.addNodeClass('constant', function(self, children) {
					return Math[self.toUpperCase()];
				}, function(self, children, ctypes) {
					return '\\' + self.toLowerCase();
			}),
		trigParser = new Parser()
			.bindASTfactory(trigASTmaker)
			.addRule('EXPR', ['TERM', 'EXPR_TAIL'])  
			.addRule('EXPR_TAIL', ['plusminus', 'TERM', 'EXPR_TAIL'], 'sum')
			.addRule('EXPR_TAIL', [])  
			.addRule('TERM', ['plusminus', 'TERM'], 'unary')
			.addRule('TERM', ['FACTOR', 'TERM_TAIL'])
			.addRule('TERM_TAIL', ['multdiv', 'FACTOR', 'TERM_TAIL'], 'times')
			.addRule('TERM_TAIL', [])
			.addRule('FACTOR', ['plusminus', 'FACTOR'], 'unary')
			.addRule('FACTOR', ['ARG', 'FACTOR_TAIL'])
			.addRule('FACTOR_TAIL', ['exp', 'ARG', 'FACTOR_TAIL'], 'pow')
			.addRule('FACTOR_TAIL', [])
			.addRule('ARG', ['constant'], 'constant')
			.addRule('ARG', ['plusminus', 'ARG'], 'unary')
			.addRule('ARG', ['variable'], 'variable')
			.addRule('ARG', ['number'], 'number')
			.addRule('ARG', ['func', 'ARG'], 'call')
			.addRule('ARG', ['lparen', 'EXPR', 'rparen']),
		parse = function(str) {
			return trigParser.run(trigTokenizer.run(str));
		},
		assembleTexModule = function(tex, tikz) {
			return '$$'+ tex + '$$\n' +
				'\\begin{tikzpicture}\n\\' + tikz + ';\n\\end{tikzpicture}';
		};
	
	
	// export

	return {
		parse: parse,
		assembleTexModule: assembleTexModule
	}
}());