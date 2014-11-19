var d3renderer = (function() {
	var tree = d3.layout.tree(),
		diagonal = d3.svg.diagonal.radial(),
		svg = null,
		container = document;
	
	function bind(containerID) {
		container = document.getElementById(containerID);
		svg = d3.select('#' + containerID).append('svg')
			.attr('transform', 'translate(0, 20)');
		
		return d3renderer;
	}
	
	function fitSVG() {
		var astDims = window.getComputedStyle(container),
			w = parseFloat(astDims.getPropertyValue('width')),
			h = parseFloat(astDims.getPropertyValue('height'));
		svg.attr('width', w).attr('height', h);
		
		tree.size([w, h - 40]);
		
		return d3renderer;
	}
	
	function asD3(astroot) {
		svg.selectAll('*').remove();
					
		var astnodes = tree.nodes(astroot),
			astlinks = tree.links(astnodes);
		
		var link = svg.selectAll('.link')
			.data(astlinks)
			.enter().append('path')
			.attr('class', 'link')
			.attr('d', diagonal);
		link.style("fill", "none");
		link.style("stroke", "#ccc");
		link.style("stroke-width", "1px");

		var node = svg.selectAll(".node")
			.data(astnodes)
			.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d) {
				return "translate(" + d.x + "," + d.y + ")";
			});
		node.style("fill", "#333");
		link.style("font-size",  "15pt");

		node.append("circle")
			.attr("r", 2);

		node.append("text")
			.attr('text-anchor', 'end')
			.attr("dy", "5pt")
			.attr('dx', '-4pt')
			.text(function(d) {
				return d.selfValue;
			});
		
		node.append("text")
			.attr("class", "cumulative")
			.attr("dy", "5pt")
			.attr('dx', '4pt')
			.text(function(d) {
				return d._value;
			});
			
		//image/svg+xml
		//var temp = document.createElement("div");
		//temp.appendChild(svg[0][0]);
		//<?xml version="1.0" encoding="UTF-8" standalone="no"?>
		//window.open('data:text/html,' + encodeURI(temp.innerHTML));
		//svg[0].parentNode.appendChild(temp.firstChild);
			
		return d3renderer;
	};
	
	function clearElement(element) {
		while (element.firstChild)
			element.removeChild(element.firstChild);
		element.style.visibility = 'hidden';
		return element;
	}
	
	function asDropDown(from, what) {
		var rect = from.getBoundingClientRect();
		what.style.left = rect.left+'px';
		what.style.top = rect.bottom+'px';
	}
	
	return {
		bind: bind,
		resizeToFit: fitSVG,
		draw: asD3,
		resetElement: clearElement,
		align: asDropDown
	};
}());