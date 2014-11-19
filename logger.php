<?php	
	if (array_key_exists('mode', $_GET)) {	
		header('Content-Type: text/javascript; charset=utf8');
		header('Access-Control-Allow-Origin: *');
		header('Access-Control-Max-Age: 3628800');
		header('Access-Control-Allow-Methods: GET');
		
		$logpath = 'history/log.json';	
		$strData = file_get_contents($logpath);
		$mode = $_GET['mode'];
		
		if ($mode == 'push' && array_key_exists('data', $_GET)) {
			$history = json_decode($strData, true);
			$plain = $_GET['data'];
			$tex = $_GET['tex'];
			print_r($history);
			echo $plain, ' ', $tex;
			$history[$plain] = array("plain" => $plain, "tex" => $tex);
			file_put_contents($logpath, json_encode($history));
		} else if ($mode == 'get') {
			echo json_encode(array_keys(json_decode($strData, true)));
		} else if ($mode == 'reset') {
			file_put_contents($logpath, '{}');		
		} else if ($mode == 'gettex') {
			function extractTex($n) { return($n['tex']); }
			print(join('\n\n', array_map('extractTex', json_decode($strData, true))));
		}
	}
?> 