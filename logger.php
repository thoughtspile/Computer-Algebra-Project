<?php	
	if (array_key_exists('mode', $_GET)) {	
		header('Content-Type: text/javascript; charset=utf8');
		header('Access-Control-Allow-Origin: *');
		header('Access-Control-Max-Age: 3628800');
		header('Access-Control-Allow-Methods: GET');
		
		$logpath = 'log.json';	
		$strData = file_get_contents($logpath);
		$mode = $_GET['mode'];
		
		if ($mode == 'push' && array_key_exists('data', $_GET)) {
			$history = json_decode($strData);
			$data = $_GET['data'];
			if (!in_array($data, $history))
				array_push($history, $data);
			file_put_contents($logpath, json_encode($history));
		} else if ($mode == 'get') {
			echo $strData;
		} else if ($mode == 'reset') {
			file_put_contents($logpath, '[]');			
		}
	}
?> 