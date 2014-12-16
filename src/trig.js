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
		cfold = new Traverser('cfold', function(self, children) {
			console.log('cback');
			var numVal = self.value(), 
				temp = null;
			if (isNaN(numVal)) {
				temp = self.clone();
				temp.children = children;
			} else {
				temp = new trigASTmaker.classes['number'](numVal);
			}
			return temp;
		}),
		pifold = new Traverser('pifold', function(self, children) {
			var temp = null;
			if (self.type === 'call' && children.length === 1 && children[0].type === 'times') {
				console.log('call hit', children[0]);
				var factors = children[0].children,
					piFactor = factors[1].type === 'constant'? 1: factors[0].type === 'constant'? 0: -1,
					hasIntFactor = Number.isSafeInteger(factors[Number(!piFactor)].value()),
					reducesToZero = self.selfValue === 'sin' || self.selfValue === 'tan';
				if (piFactor !== -1 && hasIntFactor && reducesToZero)
					return new trigASTmaker.classes['number']('0');
			}
			
			temp = self.flush();
			temp.children = children;
			return temp;
		});


	// export

	return {
		parse: parse,
		cfold: cfold,
		pifold: pifold,
		assembleTexModule: assembleTexModule
	}
}());