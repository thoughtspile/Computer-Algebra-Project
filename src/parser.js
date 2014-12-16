(function(global) {
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

	
	global.Parser = Parser;
}(this));