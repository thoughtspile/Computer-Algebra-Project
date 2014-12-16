var parser = (function() {
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
	
	
	// parser
	
	var terminalRegex = /^[a-z0-9_$]+$/;
	
	// parser constructor
	function Parser() {
		// rules are stored here: <LHS non-terminal> -> {terminal OR 'null': rule}
		this.table = {};
		// used to construct AST from token sequence
		this.factory = null;
	}
	
	// set this.factory to AST constructor
	Parser.prototype.bindASTfactory = function(factory) {
		if (!(factory instanceof ASTfactory))
			console.warn('binding unconfirmed AST factory ', factory, ' to ', this);
		this.factory = factory;
		return this;
	};
	
	// terminal symbol if no matching rule found
	Parser.prototype.isTerminal = function(token) {
		return !this.table.hasOwnProperty(token);
	};
	
	// add rule to parser: left -> right.
	// Maps into a node of class nodeClassId in AST.
	Parser.prototype.addRule = function(left, right, nodeClassId) {
		var tail = right.slice(),
			prefix = null;
		
		// The matching rule can be identified by the first (terminal) element of RHS.
		// If the rule's RHS starts with a non-terminal symbol, it's applied by default.
		if (tail.length !== 0 && terminalRegex.test(tail[0]))
			prefix = tail.shift();
		
		// Create hash for rules on first mention of lhs
		this.table[left] = this.table[left] || {};
		// construct and push the rule: on encountering <add> is pushed to expected stack, node is added to AST.
		this.table[left][prefix] = {add: tail, node: this.factory.classes[nodeClassId]};
		
		return this;
	};
		
	// Parse the token sequence:
	//   tokenList: Array of strings
	//   optional:
	//     expect: string, denotes current state
	//     expr: AST children for recursiveness
	// returns AST.
	Parser.prototype.run = function(tokenList, expect, expr) {
		// proxy for initial launch run(tokens)
		if (!isExisty(expect)) {
			tokenList = tokenList.slice();
			
			// EXPR is the default state
			var root = this.run(tokenList, 'EXPR');
			
			// check if there still are nonempty tokens in the stream
			if (tokenList[0].type !== '$')
				throw new ParseError('End not reached', tokenList[0].start);
			tokenList.pop();
			
			// return the AST constructed
			return root;
		} 
		
		// read next token
		var lookahead = tokenList[0];
		// if expecting a terminal, skip it or quit with an error
		if (this.isTerminal(expect)) {
			if (lookahead.type === expect)
				tokenList.shift();
			else
				throw new ParseError('Expected token ' + expect + ' got ' + lookahead.type, lookahead.start);
		} else {
			// cache rules
			var stateRules = this.table[expect],
				rule = null,
				node = null;
			
			// proceed according to the grammar
			if (isExisty(stateRules[lookahead.type])) { // try to find a matching rule
				rule = stateRules[lookahead.type].add;
				node = stateRules[lookahead.type].node;
				tokenList.shift();
			} else if (isExisty(stateRules[null])) { // try to find a default rule
				rule = stateRules[null].add;
				node = stateRules[null].node;
			} else { // throw an error
				throw new ParseError('No matching rule', lookahead.start);
			}
			
			var ast = null;
			if (isExisty(node)) { // current rule creates an AST node (e.g. brackets don't)
				ast = new node(lookahead.lexeme); // construct the node
				if (isExisty(expr)) { // infix/postfix operator requires the first argument
					// might consider a dedicated method for this [!!!]
					expr.parent = ast;
					ast.children.push(expr);
				}
				
				// first match is the right child (second infix argument).
				// any following match becomes the new root node in the AST.
				var first = true,
					left = null;
				for (var i = 0; i < rule.length; i++) {
					// recursive descend
					var temp = this.run(tokenList, rule[i], left);
					if (isExisty(temp)) {
						if (first === true) { // second infix arg
							ast.children.push(temp);
							temp.parent = ast;
							first = false;
							left = ast;
						} else { // new root
							ast = temp;
							left = ast;
						}
					}
					// else recursion is over
				}
			} else { // future tokens might span an AST node.
				ast = rule.reduce(function(pv, token) { // expand the rules recursively
					var temp = this.run(tokenList, token, pv);
					return isExisty(temp)? temp: pv;
				}.bind(this), null);
			}
			return ast;	
		}
	};

	
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
	
	// this might be unused [!!!]
	// seems to create an empty node or smth
	ASTfactory.prototype.create = function(id) {
		return new this.classes[id]();
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
	};
		
		
	// tokenizer
	
	// generic token class
	function Token(type, lexeme, start) {
		this.type = type;
		this.lexeme = lexeme;
		this.start = start;
	}
	
	// constructor
	function Tokenizer() {
		this.patterns = {};
		this.tokenClasses = [];
		this.pos = 0;
		
		this.addPattern('error', /^.+/);
	}
	
	// add pattern: string name, matching regex.
	Tokenizer.prototype.addPattern = function(name, regex) {
		this.patterns[name] = regex;
		this.tokenClasses.push(name);
		return this;
	};
	
	// grab the next token from the string
	Tokenizer.prototype.getNextToken = function(str) {
		var token = {},
			patterns = this.patterns, // cache
			pos = this.pos; // for error highlighting
			
		// might change to terminate early [!!!] order consequences.
		this.tokenClasses.forEach(function(name) {
			var match = str.match(patterns[name]);
			if (isExisty(match)) 
				Token.call(token, name, match[0], pos);
		});
		
		return token;
	};
	
	// tokenize the string
	Tokenizer.prototype.run = function(str) {
		var tokens = [];
		this.pos = 0;
		
		// might loop infinitely on error [!!!]
		// or is there a throw?
		while (str.length !== 0) {
			var token = this.getNextToken(str);
			if (token.type == 'error')
				throw new ParseError('Tokenization fail: ' + token.lexeme, token.start);
			// empty tokens are effectively ignored
			// [!!!] this is un-abstract =(
			else if (token.type !== 'space')
				tokens.push(token);
			str = str.substr(token.lexeme.length);
			this.pos += token.lexeme.length;
		}
		
		// because running out of tokens would break the recursion somehow
		tokens.push({type: '$', lexeme: ''});
		
		//console.log('lexer out:', tokens);		
		return tokens;
	}
	
	
	// configure
	
	// configure the tokenizer
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
		// specify AST node classes
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
		// create a parser
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
		// tokenize then parse; return AST.
		parse = function(str) {
			return trigParser.run(trigTokenizer.run(str));
		},
		// tikz figure followed by tex with proper alignment
		assembleTexModule = function(tex, tikz) {
			return '\\begin{figure}\n' +
				'\\centering{\n' + '\\begin{tikzpicture}\n\\' + tikz + ';\n\\end{tikzpicture}}\n' + 
				'$$'+ tex + '$$\n' +
				'\\end{figure}\n';
		};
	
	
	// export

	return {
		parse: parse,
		assembleTexModule: assembleTexModule
	}
}());