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

		var node = svg.selectAll(".node")
			.data(astnodes)
			.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d) {
				return "translate(" + d.x + "," + d.y + ")";
			});

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
			
		return d3renderer;
	};
	
	return {
		bind: bind,
		resizeToFit: fitSVG,
		draw: asD3
	};
}());