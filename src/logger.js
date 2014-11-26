var logInterface = (function() {
	var httpRequest,
		url = 'http://evariste.borschach.ru/logger.php';

	if (window.XMLHttpRequest) { // Mozilla, Safari, ...
		httpRequest = new XMLHttpRequest();
	} else if (window.ActiveXObject) { // IE
		try {
			httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (e) {
			try {
				httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (e) {
			}
		}
	}
		
		
	function push(data, tex) {
		httpRequest.onreadystatechange = logSuccess;
		httpRequest.open('GET', url + '?mode=push&data=' + encodeURIComponent(data) + '&tex=' + encodeURIComponent(tex), true);
		httpRequest.send();
	}
	
	
	function requestTex() {
		window.open(url + '?mode=gettex', true);
	}
	
	
	function requestPdf() {
		httpRequest.onreadystatechange = function() {
			window.setTimeout(processPdf, 700);
		};
		httpRequest.open('GET', url + '?mode=gettex', true);
	}
	
	function processPdf() {
		window.open('http://178.62.13.231/GiveMePDF.php?from="http://evariste.borschach.ru/history/query_log.tex"&name=query_log');
	}
	
	
	function get(callback) {
		httpRequest.onreadystatechange = function() {
			if (success())
				JSON.parse(httpRequest.responseText).forEach(callback);
		};
		httpRequest.open('GET', url + '?mode=get', true);
		httpRequest.send();
	}
	
	
	function success() {
		return httpRequest.readyState === 4 && httpRequest.status === 200;
	}
	

	function logResponse() {
		//if (success()) 
		//	console.log(httpRequest.responseText);
	}
	
	function logSuccess() {
		//if (success()) 
		//	console.log('push ok');
	}
	
	
	return {
		requestTex: requestTex,
		requestPdf: requestPdf,
		push: push,
		get: get
	};
}());