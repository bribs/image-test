var xTiles = 10;
var yTiles = 10;
var dim = 256;

var height = dim * yTiles * .5;
var width = dim * xTiles * .5;
var k = height / width;
var link_length = 12;

const svg = d3.select("#view_box");
const road = svg.select("#to_mordor");

// DATA - TILES
var tiles = [];
for (i = 0; i < xTiles; i++) {
    for (j = 0; j < yTiles; j++) {
        tiles.push([i, j]);
    }
}

// DATA - RACERS

var path = d3.select("#to_mordor");
var pathTotal = path.node().getTotalLength();

var z = d3.scaleOrdinal()
    .domain([0, 10])
    .range(d3.schemeCategory10);

var raw = [
    { id: "Nazgul", icon: "nazgul", color: "black", mi: 0 },
    { id: "Tyler", icon: "biker", color: "brown", mi: 3.8 },
    { id: "Conor", icon: "biker", color: "red", mi: 7.8 },
    { id: "Jurb", icon: "biker", color: "blue", mi: 49 },
    { id: "Travis", icon: "biker", color: "orange", mi: 82.1 },
    { id: "Bribs", icon: "biker", color: "green", mi: 86.1 },
    { id: "Justin", icon: "biker", color: "yellow", mi: 115.6 },
    { id: "Frodo", icon: "frodo", color: "black", mi: 135 }
]

var icons = raw.map((i) => {
    return {
        id: i.id,
        p: getPathPoint(i.mi),
        patternId: i.icon + i.id,
        img: "https://cdn.jsdelivr.net/gh/bribs/image-test/images/icons/" + i.icon + "_icon.jpg",
        radius: 12,
        fill: "url(#" + i.icon + i.id + ")",
        link_length: -1 * link_length,
        collide: 1,
        color: Number.isInteger(i.color) ? z(i.color) : i.color
    }
});

var anchors = raw.map((i) => {
    return {
        id: i.id + "_",
        p: getPathPoint(i.mi),
        radius: 1,
        fill: Number.isInteger(i.color) ? z(i.color) : i.color,
        link_length: 0,
        collide: 0,
        color: Number.isInteger(i.color) ? z(i.color) : i.color
    }
});

var links = icons.map((i) => {
    return {
        source: i.id,
        target: i.id + "_",
        value: 4,
        color: Number.isInteger(i.color) ? z(i.color) : i.color
    }
});

var points = [
    {id: "hobbiton", mi: 0, fill: "white"},
    {id: "river cross", mi: 3, fill: "white"},
    {id: "stock road", mi: 14.5, fill: "white"},
    {id: "day1", mi: 18},
    {id: "black rider", mi: 32, fill: "red"},
    {id: "day2", mi: 46},
    {id: "farmer maggot", mi: 63, fill: "white"},
    {id: "river cross", mi: 70, fill: "white"},
    {id: "crickhollow, day3", mi: 73},
    {id: "tom bombadil, day4", mi: 98},
    {id: "day6", mi: 115},
    {id: "old Cardolan boundary", mi: 123, fill: "white"},
    {id: "great east road", mi: 131, fill: "white"},
    {id: "bree, day7", mi: 135},
    {id: "west chetwood, day8", mi: 147},
    {id: "east chetwood, day9", mi: 163},
    {id: "west midgewater marshes", mi: 173, fill: "white"},
    {id: "day10", mi: 179},
    {id: "east midgewater marshes, day11", mi: 194},
    {id: "day12", mi: 211},
    {id: "weather hills, day13", mi: 229},
    {id: "weathertop", mi: 240, fill: "white"},
    {id: "nazgul, day14", mi: 241, fill: "red"},
    {id: "day15", mi: 260},
    {id: "day16", mi: 279},
    {id: "day17", mi: 298},
    {id: "day18", mi: 317},
    {id: "day19", mi: 336},
    {id: "day20", mi: 355},
    {id: "great east road", mi: 356, fill: "white"},
    {id: "the last bridge", mi: 358, fill: "white"},
    {id: "trollshaws", mi: 359, fill: "white"},
    {id: "day21", mi: 362},
    {id: "day22", mi: 368},
    {id: "day23", mi: 374},
    {id: "day24", mi: 380},
    {id: "day25", mi: 386},
    {id: "stone trolls", mi: 393, fill: "red"},
    {id: "day26", mi: 420},
    {id: "day27", mi: 440},
    {id: "attack at the ford", mi: 450, fill: "red"},
    {id: "rivendell, day28", mi: 478, fill: "black"}
]



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
    ]

    var scale; 
    for (i = 0; i < adj.length; i++) {
        if (mi < adj[i][0]) {
            scale = d3.scaleLinear()
                .domain([adj[i-1][0],adj[i][0]])
                .range([adj[i-1][1],adj[i][1]])
            break;
        }
    }

    var adj_mi = scale(mi);
    console.log('res', mi, adj_mi)

    return path.node().getPointAtLength(1.0 * adj_mi * pathTotal / 1778);
}

points = points.map((i) => { 
    var adj = (typeof i.adj === 'undefined') ? 0 : i.adj;
    return {
        id: i.id, 
        r: 1,
        p: getPathPoint(i.mi + adj), 
        fill: (typeof i.fill === 'undefined') ? "black" : i.fill,
        link_length: 0
    };});

const markers = svg.append("g")
    .selectAll("circle")
    .data(points)
    .join("circle")
    .attr("r", (d) => d.r)
    .attr("fill", (d) => (typeof d.fill === 'undefined') ? "white" : d.fill)
    .attr("stroke", "white")
    .attr("cx", (d) => d.p.x)
    .attr("cy", (d) => d.p.y);

// SCALES
var x = d3.scaleLinear()
    .domain([-4.5, 4.5])
    .range([0, width]);

var y = d3.scaleLinear()
    .domain([-4.5 * k, 4.5 * k])
    .range([height, 0]);

// Map
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

// ELEMENTS 

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

// OTHER ELEMENTS 
const gMap = svg.append("g").attr("id", "map");
gMap.lower()

var nodes = [...icons, ...anchors, ...points]

// FORCES 
const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).strength(1))
    .force("collide", d3.forceCollide((d) => (d.radius + link_length + d.link_length) * 1.5))
    //.force("charge", d3.forceManyBody());
    .force("x", d3.forceX().x((d) => d.p.x).strength(1))
    .force("y", d3.forceY().y((d) => d.p.y + d.link_length).strength(1))

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

const label = svg.selectAll(".gNode")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("class", "label")
    .attr("stroke-width", .25)
    .attr("stroke", "white")
    .attr("fill", d => "white")
    // .attr("text-anchor", "middle")
    .text(d => (d.collide && d.color != "black") ? d.id[0] : "")


markers.append("title")
    .text(d => d.id);

node.append("title")
    .text(d => d.id);


// Add a drag behavior.
node.call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended));

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

    label
        .attr("x", d => d.x - 4)
        .attr("y", d => d.y + 4);
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

// ZOOM TODO set Zoom Limits
const zoom = d3.zoom()
    .scaleExtent([.75, 8])
    //.translateExtent([[0, 0], [2560, 2560]])
    .filter((e) => e.button === 0 || e.button === 1)
    .on("zoom", zoomed);

function zoomed({ transform }) {
    console.log(transform);
    // move tiles
    gMap.call(map, transform);

    road.attr("transform", transform);

    node.attr("transform", transform);
    link.attr("transform", transform);
    label.attr("transform", transform);
    markers.attr("transform", transform);
}



// add zoom to svg, and go to default
svg.call(zoom).call(zoom.transform, d3.zoomIdentity.translate(-4200, -2900).scale(5.6));
