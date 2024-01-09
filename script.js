var xTiles = 10;
var yTiles = 10;
var dim = 256;
var zoom;

var height = dim * yTiles * .5;
var width = dim * xTiles * .5;
var k = height / width;
var link_length = 12;

var fit = (window.innerHeight > window.innerWidth) ? "height" : "width";

const svg = d3.select("#view_box").attr(fit, "100%");
const road = svg.select("#to_mordor");
var transformElements = [road];

var path = d3.select("#to_mordor");
var pathTotal = path.node().getTotalLength();

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
                    .attr("height", "256")
                    .attr("width", "256")
                    .attr("x", (d) => (d[0] * dim))
                    .attr("y", (d) => (d[1] * dim))
            },
            update => update,
            exit => exit.remove()
        )
        .attr("transform", t);

    const gMap = svg.append("g").attr("id", "map");
    gMap.lower();

    return (transform) => gMap.call(map, transform);
}

function setupZoom() {

    var drawMap = drawMapFn();

    function zoomed({ transform }) {
        //console.log(transform);
    
        // move tiles
        drawMap(transform);
    
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

    var zX = (iH > iW) ? -750 : -750;
    var zY = (iH > iW) ? -275 : -400;
    var zZ = (iH > iW) ? 3.5 : 3;

    if (typeof zoom !== 'undefined') {
        svg.call(zoom.transform, d3.zoomIdentity.scale(3).translate(zX, zY));
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

function addRacers(data, frodo) {
    var n = 0;

    data.push(frodo);
    data.push(getGollum());
    data.push(getGandalf());

    var data = data.sort((a, b) => (a.mi - b.mi));

    var icons = data.map((i) => {
        n = n + 1;

        var p = getForceP(i.mi, n-1);
        return {
            id: i.id,
            mi: i.mi,
            p: p,
            patternId: i.icon + i.id,
            img: "./images/icons/" + i.icon,
            radius: 12,
            fill: "url(#" + i.icon + i.id + ")",
            link_length: -1 * link_length,
            collide: 1,
            color: Number.isInteger(i.color) ? z(i.color) : i.color
        }
    });
    
    var anchors = data.map((i) => {
        var p = getPathPoint(i.mi);

        return {
            id: i.id + "_",
            mi: i.mi,
            p: p,
            radius: 1,
            fill: Number.isInteger(i.color) ? z(i.color) : i.color,
            link_length: 0,
            collide: 0,
            color: Number.isInteger(i.color) ? z(i.color) : i.color
        }
    });
    
    var links = data.map((i) => {
        return {
            source: i.id,
            target: i.id + "_",
            value: 4,
            color: Number.isInteger(i.color) ? z(i.color) : i.color
        }
    });
    var nodes = [...icons, ...anchors]

    // IMAGES
    var defs = svg.append("defs").attr("id", "imgdefs");
    var iconPatterns = defs.selectAll("iconPatterns")
        .data(icons)
        .enter()
        .append("pattern")
        .attr("id", (d) => d.patternId)
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
        .attr("xlink:href", (d) => d.img);

    const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", d => d.color)
        .attr("stroke-width",  2)

    const node = svg.append("g")
        .attr("class", "gNode")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", d => d.radius)
        .attr("stroke", d => d.color)
        .attr("fill", d => d.fill);

    node.append("title")
        .text(d => d.id.replaceAll("-", " ").replaceAll("_", "") + " - " + d.mi + "mi");

    // const label = svg.selectAll(".gNode")
    //     .selectAll("text")
    //     .data(nodes)
    //     .join("text")
    //     .attr("class", "label unselectable")
    //     .attr("stroke-width", .25)
    //     .attr("stroke", "white")
    //     .attr("fill", d => "white")
    //     // .attr("text-anchor", "middle")
    //     .text(d => (d.collide && d.color != "black") ? d.id[0] : "");

    // label.append("title")
    //     .text(d => d.id + " - " + d.mi + "mi");

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).strength(1))
        .force("collide", d3.forceCollide((d) => (d.radius + link_length + d.link_length) * 1.5))
        //.force("charge", d3.forceManyBody());
        .force("x", d3.forceX().x((d) => d.p.x).strength(1))
        .force("y", d3.forceY().y((d) => d.p.y).strength(1));

    // Set the position attributes of links and nodes each time the simulation ticks.
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.p.x)
            .attr("y2", d => d.target.p.y);

        node
            .attr("cx", d => (d.collide) ? d.x : d.p.x)
            .attr("cy", d => (d.collide) ? d.y : d.p.y);

        // label
        //     .attr("x", d => d.x - 4)
        //     .attr("y", d => d.y + 4);
    });

    // Reheat the simulation when drag starts, and fix the subject position.
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    // Update the subject (dragged node) position during drag.
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    // Restore the target alpha so the simulation cools after dragging ends.
    // Unfix the subject position now that it’s no longer being dragged.
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    // Add a drag behavior.
    node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    transformElements.push(node, link);
    // transformElements.push(label);

    refresh();
}

function getForceP(mi,n) {
    var dir = (n % 2) ? 1 : -1;
    var miDelta = 1;

    var miMinus = Math.max(mi - miDelta, 0);
    var miPlus = Math.min(mi + miDelta, 1778);
    var pMinus = getPathPoint(miMinus);
    var p = getPathPoint(mi);
    var pPlus = getPathPoint(miPlus);

    var m = -1 / ((pPlus.y - pMinus.y) / (pPlus.x - pMinus.x));
    dir = (m > 0) ? dir * -1 : dir;
    var m2 = m*m;
    var b2 = p.x*p.x;
    var l2 = link_length*link_length;

    var a = 1 + m2;
    var b = -2 * p.x - 2 * m2 * p.x;
    var c = b2 + m2 * b2 - l2;

    var bb4ac = b*b - 4*a*c;

    var x = (-b + dir * Math.sqrt(bb4ac)) / (2 * a);
    var y = m * (x - p.x) + p.y;

    if (miMinus == 0) y = y - 5;

    //console.log(p, m, a, b, c, x, y);

    return {
        x: x,
        y: y
    }
}

function getPathPoint(mi) {
    
    var adj = [
        [0, 0],
        [3, 3],
        [32, 35],
        [70, 63],
        [98, 100],
        [135, 156.5],
        [194, 209],
        [240, 245],
        [356, 355],
        [450, 450],
        [478, 466],
        [1778, 1778]
    ];

    //console.log(mi);
    var scale; 
    for (i = 0; i < adj.length; i++) {
        if (mi < adj[i][0]) {
            scale = d3.scaleLinear()
                .domain([adj[i-1][0],adj[i][0]])
                .range([adj[i-1][1],adj[i][1]]);
            break;
        }
    }

    var adj_mi = scale(mi);
    // console.log('res', mi, adj_mi)

    return path.node().getPointAtLength(1.0 * adj_mi * pathTotal / 1778);
}

function getJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status === 200) {
        callback(null, xhr.response);
      } else {
        callback(status, xhr.response);
      }
    };
    xhr.send();
}

function fetchJson(url, action) { 
    fetch(url).then((response) => {
        if (! response.ok) {
            throw new Error("failed to fetch " + url);
        }
        return response.json()
    }).then(json => action(json));
}

function getDayNum() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

function getMinNum() {
    var now = new Date();
    return now.getHours() * 60 + now.getMinutes();

}

function getFrodo(data) {
    data.push({ day: 0, mi: 0});
    var data = data.sort((a, b) => (a.mi - b.mi));

    var day = getDayNum();

    var mi;
    if (day <= 0) {
        mi = 0
    } else {
        var prev, cur;
        for (i = 1; i < data.length ; i++) {
            if (data[i].day <= day) {
                cur = data[i];
                prev = data[i-1];
            } 
        }

        var scale = d3.scaleLinear()
            .domain([0,1439])
            .range([prev.mi, cur.mi]);

        mi = (cur.day == day) ? round(scale(cur.mi)) : cur.mi;
    }

    return {
        id: "Frodo",
        icon: "frodo_icon2.png",
        color: "black",
        mi: mi
    };
}

function round(num) {
    return Math.round(num * 100) / 100;
}

function getGollum() {
    var grace = 7;
    var day = getDayNum();
    var min = getMinNum();

    var day_adj = day - grace;
    if (day_adj < 0) return 0;

    var scale = d3.scalePow()
        .domain([0, (365-grace) * 1440 + 1439])
        .range([0, 1778])
        .exponent(2);

    return {
        id: "Gollum",
        icon: "gollum_icon.png",
        color: "black",
        mi: round(scale((day - grace - 1) * 1440 + getMinNum()))
    };
}

function getGandalf() {
    var day = getDayNum();

    var scale = d3.scaleLinear()
        .domain([0, 183 * 1440 + 1439])
        .range([0, 1778]);

    var min_adj = (day - 1) * 1440 + getMinNum();
    var mi = scale(min_adj);
    var mi_rounded = round(mi);

    console.log(day, min_adj, mi, mi_rounded);

    return {
        id: "Arrives-exactly-when-he-means-to",
        icon: "gandalf_icon.png",
        color: "black",
        mi: mi_rounded
    };
}

fetchJson('./data/locations.json', (d) => {
    addPoints(d, "white");
    fetchJson('./data/frodo.json', (d) => {
        var day = getDayNum();
        var frodo = getFrodo(d);
        addPoints(d.filter((i) => i.day < day), "black");
        fetchJson('./data/miles.json', (d) => addRacers(d, frodo));
    });
});

// getJSON('https://cdn.jsdelivr.net/gh/bribs/image-test/data/frodo.json',
//     (err, data) => (err !== null) ? alert('frodo req failed') : addPoints(data));
// getJSON('https://cdn.jsdelivr.net/gh/bribs/image-test/data/locations.json',
//     (err, data) => (err !== null) ? alert('locations req failed') : addPoints(data));
// getJSON('https://cdn.jsdelivr.net/gh/bribs/image-test/data/miles.json',
//     (err, data) => (err !== null) ? alert('racers req failed') : addRacers(data));



zoom = setupZoom();
refresh();
