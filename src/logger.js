var logInterface = (function() {
	var httpRequest,
		url = 'http://borschach.ru/compalgebra_stuff/logger.php';

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
	
	function logResponse() {
		if (httpRequest.readyState === 4 && httpRequest.status === 200)
			console.log(httpRequest.responseText);
	}
	
	function logSuccess() {
		if (httpRequest.readyState === 4 && httpRequest.status === 200)
			console.log('push ok');
	}
	
	return {
		push: push,
		get: get
	};
}());