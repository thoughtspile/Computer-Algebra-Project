var parser = (function() {
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
		},
		isNumNode = function isNumNode(self) {
			var allNumChildren = self.children.length? self.children.map(isNumNode).every(function(c) {return c}): false;
			self._memos.isNum = (self.type === 'number' || allNumChildren);
			return self._memos.isNum;
		},
		cfold = function cfold(self) {
			if (!isExisty(self.parent))
				isNumNode(self);
			var children = self.children.map(cfold),
				temp = null;
			if (self._memos.isNum === false) {
				temp = self;
				temp.children = children;
			} else {
				temp = new trigASTmaker.classes['number'](self.value());
			}
			return temp;
		},
		pifold = function pifold(self) {
			children = self.children.map(pifold);
			if (self.type === 'call') {
				if (children.length === 1 && children[0].type === 'times' && children[0].selfValue === '*') {
					var factors = children[0].children,
						piFactor = (factors.length > 1 && factors[1].type === 'constant')? 1: factors[0].type === 'constant'? 0: -1,
						intFactor = (factors.length === 1)? 1: factors[Number(!piFactor)].value(),
						isInt = Number.isSafeInteger(intFactor),
						isEven = Number.isSafeInteger(intFactor / 2),
						isIntAndHalf = Number.isSafeInteger(intFactor - 0.5),
						isEvenAndHalf = Number.isSafeInteger((intFactor - 0.5) / 2),
						reducible = isInt || isIntAndHalf;
					console.log(reducible, piFactor, factors, factors.length);
					if (piFactor !== -1 && reducible) {
						var val,
							func = self.selfValue
							neg = false;
						if ((func === 'sin' || func === 'tan') && isInt ||
							(func === 'cos' || func === 'cot') && isIntAndHalf) {
							val = 0;
						} else if (func === 'sin') {
							val = 1;
							neg = !isEvenAndHalf;
						} else if (func === 'cos') {
							val = 1;
							neg = !isEven;						
						} else if (func === 'tan') {
							val = Infinity;
							neg = !isEvenAndHalf;
						} else if (func === 'cot') {
							val = Infinity;
							neg = !isEven;
						}
							
						var abs = new trigASTmaker.classes['number'](val);
						if (!neg) {
							return abs;
						} else {
							var neg = new trigASTmaker.classes['unary']('-');
							neg.children.push(abs);
							abs.parent = neg;
							return neg;
						}
					}
				}
			}
			
			var temp = self.flush();
			temp.children = children;
			return temp;
		};


	// export

	return {
		parse: parse,
		cfold: cfold,
		pifold: pifold,
		assembleTexModule: assembleTexModule
	}
}());