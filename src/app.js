(function() {
	var expr = document.getElementById('expression'),
		suggest = document.getElementById('suggest'),
		dynaList = document.getElementById('optionList'),
		go = document.getElementById('go'),
		update = function() {	
			d3renderer.resetElement(suggest, dynaList);
				
			var selection = window.getSelection(),
				range = null;
			if (selection.rangeCount !== 0 && selection.focusNode === expr) {
				var range = selection.getRangeAt(0),
					offset = range.startOffset;
			}
			unmarkError();
			
			try {
				var astroot = parser.parse(expr.innerHTML);
				astroot.value();
				console.log('FOLDING', parser.cfold.map(astroot))
				d3renderer.draw(parser.pifold.map(astroot));
				logInterface.push(expr.innerHTML, parser.assembleTexModule(astroot.texify(), astroot.tikzify()));
			} catch (err) {
				markError(err.position);
				console.log(err.message);
			}
			
			if (range)
				range.setStart(expr.firstChild, offset);
		},
		markError = function(pos) {
			var current = expr.innerHTML;
			if (pos >= current.length)
				pos = 0;
			expr.innerHTML = current.substr(0, pos) + '<span id="error">' + current.substr(pos) + '</span>';
		},
		unmarkError = function() {
			expr.innerHTML = expr.innerHTML.replace(/<(.*?)>/g, '');
		},
		fitSVG = function() {
			d3renderer.resizeToFit();
			update();
		};
		
	go.addEventListener('click', update);
	expr.addEventListener('keypress', function(e) {
		if (e.keyCode === 13) {
			e.preventDefault();
			update();
		}
	});
	expr.addEventListener('focus', function() {
		d3renderer.align(expr, suggest);
		logInterface.get(function(val) {
			var newDiv = document.createElement('div');
			newDiv.className = 'suggestEl';
			newDiv.innerHTML = val;
			newDiv.addEventListener('mousedown', function(e) {
				expr.innerHTML = val;
				update();
			});
			dynaList.appendChild(newDiv);
		});
		suggest.style.visibility = 'visible';
	});
	expr.addEventListener('blur', function() {
		d3renderer.resetElement(suggest, dynaList);
	});
	window.addEventListener('resize', fitSVG);
	
	document.getElementById('texButton').addEventListener('click', logInterface.requestTex);
	document.getElementById('pdfButton').addEventListener('click', logInterface.requestPdf);
	
	d3renderer.bind('AST_area');
	fitSVG();
}());