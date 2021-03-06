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
		
	function push(data) {
		console.log('logging', data);
		httpRequest.onreadystatechange = logSuccess;
		httpRequest.open('GET', url + '?mode=push&data=' + data, true);
		httpRequest.send();
	}
	
	function get() {
		httpRequest.onreadystatechange = logResponse
		httpRequest.open('GET', url + '?mode=get', true);
		httpRequest.send();
	}
	
	function success() {
		return httpRequest.readyState === 4 && httpRequest.status === 200;
	}
	
	function logResponse() {
		if (success()) 
			console.log(httpRequest.responseText);
	}
	
	function logSuccess() {
		if (success()) 
			console.log('push ok');
	}
	
	return {
		push: push,
		get: get
	};
}());