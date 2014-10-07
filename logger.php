<?php	
	if (array_key_exists('mode', $_GET)) {	
		header('Content-Type: text/javascript; charset=utf8');
		header('Access-Control-Allow-Origin: http://www.thoughtspile.github.io/');
		header('Access-Control-Max-Age: 3628800');
		header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
		
		$logpath = 'log.json';	
		$strData = file_get_contents($logpath);
		$mode = $_GET['mode'];
		
		if ($mode == 'push' && array_key_exists('data', $_GET)) {
			$history = json_decode($strData);
			array_push($history, $_GET['data']);
			file_put_contents($logpath, json_encode($history));
		} else if ($mode == 'get') {
			echo $strData;
		} else if ($mode == 'reset') {
			file_put_contents($logpath, '[]');			
		}
	}
?> 