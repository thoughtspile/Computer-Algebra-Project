var parser = (function() {
	// utils
	
	function isExisty(obj) {
		return typeof(obj) !== 'undefined' && obj !== null;
	};

	
	// parser
	
	function Parser() {
		this.rules = [];
	}
	
	Parser.prototype.addRule = function(left, right) {
		var tail = right.slice(),
			flag = tail.shift();
		this.rules.forEach(function(rule) {
			if (rule.state == 'right' && rule.flag == flag)
				throw new Error('Not an LL(1) grammar!');
		});
		this.rules.push({state: left, flag: flag, tail: tail});
		return this;
	};
	
	Parser.prototype.run = function(str) {
		return AST.create(null, trigTokenizer.run(str), 'expr');
	};

	
	function AST(leftAST, tokenList, state) {
		var nextToken = tokenList.shift() || {type: 'empty', lexeme: ''},
			nextLexeme = nextToken.lexeme,
			nextTerminal = nextToken.type;
		if (state == 'expr') {
			if (nextTerminal == 'literal') {
				this.type = 'val';
				this.source = nextLexeme;
				this.children = [];
			} else if (nextTerminal == 'op') {
				this.type = 'op';
				this.source = nextLexeme;
				this.children = [leftAST, new AST(tokenList, 'expr')];
			} else if (nextTerminal == 'minus') {
				this.type = 'minus';
				this.source = nextLexeme;
				this.children = [leftAST, new AST(tokenList, 'expr')];
			} else if (nextTerminal == 'func') {
				this.type = 'func';
				this.source = nextLexeme;
				this.children = [new AST(tokenList, 'args')];
			} else {
				throw new Error('parsing rule error');
			}
		} else if (state == 'args') {
			if (nextTerminal == 'lparen') {				
				AST.call(this, tokenList, 'awaitParen');
			} else {
				throw new Error('parsing rule error');
			}
		} else if (state == 'awaitParen') {
			// beware of this evil shit
			tokenList.splice(0, nextTerminal);
			var lastToken = tokenList.pop(),
				lastTerminal = lastToken.type;
			if (lastTerminal == 'rparen') {	
				AST.call(this, tokenList, 'expr');
			} else {
				throw new Error('parsing rule error');
			}
		} else {
			this.type = 'empty';
			this.source = nextLexeme;
			this.children = [];
		}
	}
	
	AST.create = function(leftAST, tokenList, state) {
		//if (!isExisty(AST.memo[str]))
		//	return AST.memo[str] = new AST(str);
		//return AST.memo[str];
		return new AST(leftAST, tokenList, state);
	};
	
	AST.nodeClasses = {
		'value': 'VAL',
		'operator': 'OP'
	};
	
	AST.memo = {
	};
		
		
	// tokenizer
	function Tokenizer() {
		this.patterns = {};
		this.tokenClasses = [];
		
		this.addPattern('error', /^.+/);
	}
	
	Tokenizer.prototype.addPattern = function(name, regex) {
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
		
		for (i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (token.source == '-' && (i == 0 || tokens[i - 1].type == 'op' || tokens[i - 1].type == 'lparen'))
				token.type == 'uminus';
		}
		
		console.log(tokens);
		
		return tokens;
	}
	
	var trigTokenizer = new Tokenizer()
			.addPattern('op', /^[+-/*]/)
			.addPattern('literal', /^[A-Za-z_$]+[A_Za-z_$0-9]*|^[0-9]*.[0-9]+|^[0-9]+/)
			//.addPattern('constant', /^pi|^e/)
			.addPattern('func', /^sin|^cos|^tan|^cot/)
			.addPattern('lparen', /^[(]/)
			//.addPattern('separator', /^[;]/)
			.addPattern('rparen', /^[)]/)
			.addPattern('space', /^\s+/),
		trigParser = new Parser();
	
	// export

	return {
		parse: trigParser.run
	}
}());