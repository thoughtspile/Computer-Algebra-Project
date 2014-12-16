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
