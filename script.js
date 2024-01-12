var xTiles = 10;
var yTiles = 10;
var dim = 256;
var zoom;
var npc_color = "#484848";

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

    var tiles = [[0,0]]

    var map = (g, t) => g
        .selectAll("image")
        .data(tiles)
        .join(
            enter => {
                return enter.append("image")
                    .attr("xlink:href", (d) => "./images/mordor_larger.png")
                    .attr("height", "2560")
                    .attr("width", "2560")
                    .attr("x", 0)
                    .attr("y", 0);
            },
            update => update,
            exit => exit.remove()
        )
        .attr("transform", t);

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

function addRacers(racerData, totalsData, frodo, onClickFn) {
    var n = 0;

    racerData.forEach(racer => {
        if (typeof racer.mi === 'undefined' && typeof racer.name !== 'undefined') {
            racer.mi = round(totalsData[racer.name]["mi"])
        } else {
            racer.static = true
        }
    });

    racerData.push(getFellowship(racerData));
    racerData.push(frodo);
    racerData.push(getGollum());
    racerData.push(getGandalf());

    var racerData = racerData.sort((a, b) => (a.mi - b.mi));

    var onClickFnPlaceholder = {};
    onClickFnPlaceholder.fn = (d) => false;

    var icons = racerData.map((i) => {
        var data = {
            id: i.id,
            mi: i.mi,
            patternId: i.icon + i.id,
            img: "./images/icons/" + i.icon,
            radius: 12,
            fill: "url(#" + i.icon + i.id + ")",
            link_length: -1 * link_length,
            collide: 1,
            color: Number.isInteger(i.color) ? z(i.color) : i.color,
            static: isStatic(i),
            onClickObj: onClickFnPlaceholder
        }

        data.p = getForceP(data, n++);
        data.radius = (isStatic(data)) ? 8 : 12;
        data.eta = (isStatic(data)) ? getETA(0) : (typeof i.eta !== 'undefined') ? i.eta : getETA(i.mi);
        return data;
    });
    
    var anchors = racerData.filter((i) => !isStatic(i)).map((i) => {
        var p = getPathPoint(i.mi);

        return {
            id: i.id + "_",
            mi: i.mi,
            p: p,
            radius: 1,
            fill: Number.isInteger(i.color) ? z(i.color) : i.color,
            link_length: 0,
            collide: 0,
            color: Number.isInteger(i.color) ? z(i.color) : i.color,
            eta: (typeof i.static === 'undefined') ? getETA(i.mi) : getETA(0),
            static: (typeof i.static === 'undefined') ? false : i.static,
            onClickObj: onClickFnPlaceholder
        }
    });
    
    var links = racerData.filter((i) => !isStatic(i)).map((i) => {
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

    const static_node = svg.append("g")
        .attr("class", "gNode")
        .attr("stroke-width", 1)
        .selectAll("circle")
        .data(nodes.filter((d) => isStatic(d)))
        .join("circle")
        .attr("r", d => d.radius)
        .attr("stroke", d => d.color)
        .attr("fill", d => d.fill);

        static_node.append("title")
            .text(d => d.id.replaceAll("-", " ").replaceAll("_", ""));


    const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", d => d.color)
        .attr("stroke-width",  2.5)
        .attr("stroke-opacity", .65)
        .attr("stroke-linecap", "round")

    const node = svg.append("g")
        .attr("class", "gNode")
        .attr("stroke-width", 1.5)
        .style("stroke-opacity",".5")
        .selectAll("circle")
        .data(nodes.filter((d) => !isStatic(d)))
        .join("circle")
        .attr("r", d => d.radius)
        .attr("stroke", d => d.color)
        .attr("stroke-opacity", (d) => (d.radius == 1) ? 0 : 1)
        .attr("fill", (d) => (d.radius == 1) ? "none" : d.fill)
        .attr("fill-opacity", (d) => (d.radius == 1) ? 0 : 1);


    node.append("title")
        .text(d => {
            var text = d.id.replaceAll("-", " ").replaceAll("_", "");
            if (!d.static) {
                text += " - " + d.mi + "mi";
                if (typeof d.eta !== 'undefined') {
                    var suffix = (d.eta == 1) ? " day" : " days"
                    text += ", ETA: " + d.eta + suffix
                }
            }
            return text;
    });

    onClickFnPlaceholder.fn = addStatsOverlay();

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
        .force("collide", d3.forceCollide((d) => {
            return (isStatic(d)) ? 0 : d.radius * 1.2;
        }))
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

        static_node 
            .attr("cx", d => d.p.x)
            .attr("cy", d => d.p.y);
        node
            .attr("cx", d => (d.collide) ? d.x : d.p.x)
            .attr("cy", d => (d.collide) ? d.y : d.p.y);

        // label
        //     .attr("x", d => d.x - 4)
        //     .attr("y", d => d.y + 4);
    });

    // Reheat the simulation when drag starts, and fix the subject position.
    function dragstarted(event, onClickFn) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.prev_x = event.x;
        event.subject.prev_y = event.y;
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        event.subject.onClickObj.fn(event.subject);
    }

    // Update the subject (dragged node) position during drag.
    function dragged(event) {
        var prev_x = event.subject.prev_x;
        var prev_y = event.subject.prev_y;

        event.subject.fx = event.subject.fx + (event.x - prev_x) / current_transform.k;
        event.subject.fy = event.subject.fy + (event.y - prev_y) / current_transform.k;
        event.subject.prev_x = event.x;
        event.subject.prev_y = event.y;

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
        .on("start", dragstarted, onClickFn)
        .on("drag", dragged)
        .on("end", dragended));

    transformElements.push(static_node, node, link);
    // transformElements.push(label);

    refresh();
}

function getForceP(d, n) {

    var mi = d.mi
    var n;

    var dir = (n % 2) ? 1 : -1;
    var miDelta = 5;

    var miMinus = Math.max(mi - miDelta, 0);
    var miPlus = Math.min(mi + miDelta, 1778);
    var pMinus = getPathPoint(miMinus);
    var p = getPathPoint(mi);
    var pPlus = getPathPoint(miPlus);

    if (isStatic(d)) return p;

    var m = -1 / ((pPlus.y - pMinus.y) / (pPlus.x - pMinus.x));
    dir = (m > 0) ? dir * -1 : dir;
    var m2 = m*m;
    var b2 = p.x*p.x;
    var l2 = d.link_length * d.link_length;

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
        [478, 465.75],
        [1778, 1778]
    ];

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
    return path.node().getPointAtLength(1.0 * adj_mi * pathTotal / 1778);
}

function getETA(mi) {
    var day = getDayNum();
    if (mi > 0) {
        var est = (1778 / (mi / day)) - day;
        if (est < 366) return Math.ceil(est)
    }
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
    var min = getMinNum();

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

        mi = (cur.day == day) ? round(scale(min)) : cur.mi;
    }

    return {
        id: "Frodo",
        icon: (mi >= 241 && mi <= 478) ? "stabbed_frodo2.png" : "frodo_icon2.png",
        color: npc_color,
        mi: mi,
        eta: (184 - day)
    };
}

function round(num) {
    return Math.round(num * 10) / 10;
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
        .exponent(1.5);

    return {
        id: "Gollum",
        icon: "gollum_icon.png",
        color: "black",
        mi: round(scale((day - grace - 1) * 1440 + getMinNum())),
        eta: 366 - day
    };
}

function getFellowship(racerData) {
    var total = 0;
    var num = 0;
    for (racer of racerData) {
        if (typeof racer.static === 'undefined') {
            total += racer.mi;
            num += 1;
        }
    }

    return {
        id: "Fellowship",
        icon: "fellowship_icon.png",
        color: npc_color,
        mi: round(total / num)
    }

}

function getGandalf() {
    var day = getDayNum();

    var scale = d3.scaleLinear()
        .domain([0, 184 * 1440])
        .range([0, 1778]);

    var min_adj = (day - 1) * 1440 + getMinNum();
    var mi = scale(min_adj);
    var mi_rounded = round(mi);

    return {
        id: "Arrives-exactly-when-he-means-to",
        icon: "gandalf_icon.png",
        color: npc_color,
        mi: mi_rounded,
        eta: getETA(scale(day * 1440))
    };
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

    fields = ["statsMiles", "statsAverage", "statsRemaining", "statsETA"]
    for (i = 0; i < fields.length; i++) {
        gStats
            .append("text")
            .attr("class", "statsText")
            .attr("id", fields[i])
            .attr("x", width / 10 + 40)
            .attr("y", i*55 + 91)
            .text(fields[i]);
    }

    var icon = gStats.selectAll(".statsIcon");
    var background = gStats.selectAll(".statsTextBox")
    var textElements = fields.map((i) => gStats.select("#" + i));

    return (d) => {

        if (typeof d.img !== 'undefined' && !isStatic(d)) {
            gStats.attr("opacity", "100");
            icon.attr("fill", d.fill);

            icon.attr("stroke", d.color);
            background.attr("stroke", d.color);
            
            textElements[0].text(d.mi + " mi");
            textElements[1].text(round(d.mi / getDayNum()) + " mi per day");
            textElements[2].text(1778 - d.mi + " mi to go");
            var eta = (exists(d.eta)) ? ("ETA " + d.eta + ((d.eta == 1) ? " day" : " days")) : "";
            textElements[3].text(eta);
        } else {
            gStats.attr("opacity", "0");
        }
    };

}

function exists(d) {
    return typeof d !== 'undefined';
}

function isStatic(d) {
    return typeof d.static !== 'undefined' && d.static;
}
fetchJson('./data/locations.json', (locationsData) => {
    addPoints(locationsData, "white");

    fetchJson('./data/frodo.json', (frodoData) => {
        var day = getDayNum();
        var frodo = getFrodo(frodoData);
        addPoints(frodoData.filter((i) => i.day < day), "black");

        fetchJson('./totals.json', (totalsData) => {
            fetchJson('./data/racers.json', (racerData) => addRacers(racerData,     totalsData, frodo));
        });
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
