var xTiles = 10;
var yTiles = 10;
var dim = 256;
var zoom;

var height = dim * yTiles;
var width = dim * xTiles;
var k = height / width;
var link_length = 20;

var fit = (window.innerHeight > window.innerWidth) ? "height" : "width";

const svg = d3.select("#view_box").attr(fit, "100%");
const road = svg.select("#to_mordor");
var transformElements = [road];

var path = d3.select("#to_mordor");
var pathTotal = path.node().getTotalLength();

var current_transform = d3.zoomIdentity;

function drawMapFn() {

    var tiles = [];
    for (i = 0; i < xTiles; i++) {
        for (j = 0; j < yTiles; j++) {
            tiles.push([i, j]);
        }
    }

    var map = (g, t, x, y) => g
        .selectAll("image")
        .data(tiles)
        .join(
            enter => {
                return enter.append("image")
                    .attr("xlink:href", (d) => "https://cdn.jsdelivr.net/gh/bribs/image-test/images/4/" + d[0] + "/" + (yTiles - 1 - d[1]) + ".jpg")
                    .attr("height", dim + .2)
                    .attr("width", dim + .2)
                    .attr("x", (d) => (d[0] * dim))
                    .attr("y", (d) => (d[1] * dim));
            update => update,
            exit => exit.remove()}
        ).attr("transform", t);

    const gMap = svg.append("g").attr("id", "map")
    gMap.lower();

    return (transform) => gMap.call(map, transform);
}

function setupZoom() {

    var drawMap = drawMapFn();

    function zoomed({ transform }) {
        //console.log(transform);
        current_transform = transform;
    
        // move tiles
        drawMap(transform);
        //onClickFn({});
    
        for (elem of transformElements) {
            elem.attr("transform", transform);
        }
    }

    var iH = window.innerHeight;
    var iW = window.innerWidth;

    var zW = (iW > iH) ? 2560 : 2560*(2-iW/iH);
    var zH = (iW > iH) ? 2560*(2-iH/iW) : 2560;
    //console.log(iW, iH, zW, zH);

    var zoom = d3.zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [zW, zH]])
        .on("zoom", zoomed);

    // add zoom to svg
    svg.call(zoom)
        
    return zoom;
}

function refresh() {
    var iH = window.innerHeight;
    var iW = window.innerWidth;

    var zX = (iH > iW) ? -825 : -750;
    var zY = (iH > iW) ? -275 : -400;
    var zZ = (iH > iW) ? 2 : 3;

    if (typeof zoom !== 'undefined') {
        svg.call(zoom.transform, d3.zoomIdentity.scale(zZ).translate(zX, zY));
    }
}

function addPoints(data, defaultFill) {

    var points = data.map((i) => { 
        var adj = (typeof i.adj === 'undefined') ? 0 : i.adj;
        return {
            id: i.id, 
            r: 1,
            p: getPathPoint(i.mi + adj), 
            fill: (typeof i.fill === 'undefined') ? defaultFill : i.fill,
            link_length: 0
        };});
    
    const markers = svg.append("g")
        .selectAll("circle")
        .data(points)
        .join("circle")
        .attr("r", (d) => d.r)
        .attr("fill", (d) => d.fill)
        .attr("stroke", "white")
        .attr("cx", (d) => d.p.x)
        .attr("cy", (d) => d.p.y);

    markers.append("title")
        .text(d => d.id);    

    transformElements.push(markers);

    refresh();
}

function addRacers(racerData, totalsData, frodoData, onClickFn) {

    var racerFactory = new RacerFactory();

    var racers = racerData.map((d) => {
        if (typeof d.mi === 'undefined' && typeof d.name !== 'undefined') {
            var gollumd = (typeof d.gollumd === 'undefined') ? false : d.gollumd;
            return racerFactory.createRacer(d.id, d.icon, d.color, totalsData[d.name], gollumd);
        } else {
            return racerFactory.createStaticRacer(d.id, d.icon, d.mi);
        }
    });

    racers = racers.concat(racerFactory.createNPCs(frodoData));
    racers = racers.sort((a, b) => (a.mi - b.mi));

    var invert = true; 
    racers.forEach((r) => {
        if (!r.static) {
            r.invert(invert);
            invert = !invert;
        }
    });

    // IMAGES
    var defs = svg.append("defs").attr("id", "imgdefs");
    var iconPatterns = defs.selectAll("iconPatterns")
        .data(racers)
        .enter()
        .append("pattern")
        .attr("id", (d) => d.node.patternId)
        .attr("height", "100%")
        .attr("width", "100%")
        .attr("patternContentUnits", "objectBoundingBox")
        .attr("x", "0")
        .attr("y", "0");

    var iconImages = iconPatterns
        .append("image")
        .attr("class", "iconImage")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", 1)
        .attr("width", 1)
        .attr("perserveAspectRatio", "xMidYMid slice")
        .attr("xlink:href", (d) => d.node.img);

    const status_node1 = svg.append("g")
        .attr("class", "gNode")
        .attr("stroke-width", .5)
        //.attr("opacity", .)
        .selectAll("circle")
        .data(racers.filter((d) => d.gollumd))
        .join("circle")
        .attr("r", d => d.node.radius)
        .attr("stroke", d => d.color)
        .attr("fill", "black")
        .attr("fill-opacity", 1);    

    const static_node = svg.append("g")
        .attr("class", "gNode")
        .attr("stroke-width", 1)
        .selectAll("circle")
        .data(racers.filter((d) => d.static))
        .join("circle")
        .attr("r", d => d.node.radius)
        .attr("stroke", d => d.color)
        .attr("fill", d => d.node.fill)
        .attr("fill-opacity", (d) => d.gollumd ? .5 : 1);

    static_node.append("title")
        .text(d => d.id.replaceAll("-", " ").replaceAll("_", ""));

    const link = svg.append("g")
        .selectAll("line")
        .data(racers.filter((d) => !d.static))
        .join("line")
        .attr("stroke", d => d.color)
        .attr("stroke-width",  2.5)
        .attr("stroke-opacity", .65)
        .attr("stroke-linecap", "round")

    const node = svg.append("g")
        .attr("class", "gNode")
        .attr("stroke-width", 1.5)
        .style("stroke-opacity",".5")
        .selectAll(".racerNode")
        .data(racers.filter((d) => !d.static))
        .join("circle")
        .attr("r", d => d.node.radius)
        .attr("stroke", d => d.color)
        .attr("stroke-opacity", 1)
        .attr("fill", (d) => d.node.fill)
        .attr("fill-opacity", (d) => d.gollumd ? .5 : 1);

    node.append("title")
        .text(d => {
            var text = d.id.replaceAll("-", " ").replaceAll("_", "");
            if (!d.static) {
                text += " - " + d.mi + "mi";
                // TODO add eta text
            }
            return text;
    });

    const status_node2 = svg.append("g")
        .attr("class", "gNode")
        .attr("stroke-width", .5)
        .selectAll("circle")
        .data(racers.filter((d) => d.gollumd))
        .join("circle")
        .attr("r", d => d.node.radius * .6)
        .attr("stroke", d => d.color)
        .attr("fill", d => "url(#gollum_icon.pngGollum)")
        .attr("fill-opacity", 1);

    status_node2.append("title").text("Gollum'd")

    var links = racers.filter(r => !r.static).map(r => r.link);
    var nodes = [...racers.map(r => r.node), ...racers.filter((r) => !r.static).map(r => r.anchor)]

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).strength(1))
        .force("collide", d3.forceCollide(d => d.radius * d.collide))
        .force("x", d3.forceX().x((d) => d.p.x).strength(1))
        .force("y", d3.forceY().y((d) => d.p.y).strength(1));

    // Set the position attributes of links and nodes each time the simulation ticks.
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.node.x)
            .attr("y1", d => d.node.y)
            .attr("x2", d => d.anchor.p.x)
            .attr("y2", d => d.anchor.p.y);

        static_node 
            .attr("cx", d => d.node.p.x)
            .attr("cy", d => d.node.p.y);

        node
            .attr("cx", d => (d.node.collide > 0) ? d.node.x : d.node.p.x)
            .attr("cy", d => (d.node.collide > 0) ? d.node.y : d.node.p.y);

        status_node1
            .attr("cx", d => d.node.x + d.node.radius * 0)
            .attr("cy", d => d.node.y + d.node.radius * 0);

        status_node2
            .attr("cx", d => d.node.x + d.node.radius * .80)
            .attr("cy", d => d.node.y + d.node.radius * .44);
    });

    var onClickFn = addStatsOverlay();

    // Reheat the simulation when drag starts, and fix the subject position.
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.prev_x = event.x;
        event.subject.prev_y = event.y;
        event.subject.node.fx = event.subject.node.x;
        event.subject.node.fy = event.subject.node.y;
        onClickFn(event.subject);
    }

    // Update the subject (dragged node) position during drag.
    function dragged(event) {
        var prev_x = event.subject.prev_x;
        var prev_y = event.subject.prev_y;

        event.subject.node.fx = event.subject.node.fx + (event.x - prev_x) / current_transform.k;
        event.subject.node.fy = event.subject.node.fy + (event.y - prev_y) / current_transform.k;
        event.subject.prev_x = event.x;
        event.subject.prev_y = event.y;

    }

    // Restore the target alpha so the simulation cools after dragging ends.
    // Unfix the subject position now that it’s no longer being dragged.
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.node.fx = null;
        event.subject.node.fy = null;
    }

    // Add a drag behavior.
    node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    transformElements.push(static_node, node, status_node1, status_node2, link);

    refresh();
}

function fetchJson(url, action) { 
    fetch(url).then((response) => {
        if (! response.ok) {
            throw new Error("failed to fetch " + url);
        }
        return response.json()
    }).then(json => action(json));
}

function addStatsOverlay() {
    var gStats = svg.append("g")
        .attr("id", "gStats")
        .attr("opacity", 0);
    
    gStats
        .append("rect")
        .attr("class", "statsTextBox")
        .attr("x", 20)
        .attr("y", 20)
        .attr("rx", 15)
        .attr("height", height / 10)
        .attr("width", width * 1.1 / 10)
        .attr("stroke-width", "10px")
        .attr("stroke", "black")
        .attr("fill, black");

    gStats
        .append("rect")
        .attr("class", "statsTextBox")
        .attr("x", width / 10 + 20)
        .attr("y", 20)
        .attr("rx", 15)
        .attr("height", height / 10)
        .attr("width", width * 1.1 / 10)
        .attr("stroke-width", "10px")
        .attr("stroke", "black")
        .attr("fill, black");

    gStats
        .append("rect")
        .attr("class", "statsIcon")
        .attr("x", 20)
        .attr("y", 20)
        .attr("rx", 15)
        .attr("height", height / 10)
        .attr("width", width / 10)
        .attr("stroke-width", "10px")
        .attr("stroke", "black")
        .attr("fill, black");

    fields = ["statsMiles", "statsAverage", "statsRemaining", "statsETA", "statsStatus"]
    for (i = 0; i < fields.length; i++) {
        gStats
            .append("text")
            .attr("class", "statsText")
            .attr("id", fields[i])
            .attr("x", width / 10 + 40)
            .attr("y", i*41 + 91)
            .text(fields[i]);
    }

    var icon = gStats.selectAll(".statsIcon");
    var background = gStats.selectAll(".statsTextBox")
    var textElements = fields.map((i) => gStats.select("#" + i));

    return (d) => {

        if (!d.static) {
            gStats.attr("opacity", "100");
            icon.attr("fill", d.node.fill);

            icon.attr("stroke", d.color);
            background.attr("stroke", d.color);
            
            textElements[0].text(d.miText());
            textElements[1].text(d.perDayText());
            textElements[2].text(d.togoText());
            textElements[3].text(d.etaText());
            textElements[4].text(d.statusText());
        } else {
            gStats.attr("opacity", "0");
        }
    };

}

fetchJson('./data/locations.json', (locationsData) => {
    addPoints(locationsData, "white");

    fetchJson('./data/frodo.json', (frodoData) => {
        addPoints(frodoData.filter((i) => i.day < getDayNum()), "black");

        fetchJson('./totals.json', (totalsData) => {
            fetchJson('./data/racers.json', (racerData) => addRacers(racerData, totalsData, frodoData));
        });
    });
});

zoom = setupZoom();
refresh();
