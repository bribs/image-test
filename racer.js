function getDayNum() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

function getMinNum() {
    var now = new Date();
    return now.getHours() * 60 + now.getMinutes();

}

function round(num) {
    return Math.round(num * 10) / 10;
}

function getPathPoint(mi) {

    console.log(mi);
    
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

function getForceP(mi, link_length, invert = false) {

    var dir = (invert) ? -1 : 1;
    var miDelta = 5;

    var miMinus = Math.max(mi - miDelta, 0);
    var miPlus = Math.min(mi + miDelta, 1778);
    var pMinus = getPathPoint(miMinus);
    var p = getPathPoint(mi);
    var pPlus = getPathPoint(miPlus);

    var m = -1 / ((pPlus.y - pMinus.y) / (pPlus.x - pMinus.x));
    dir = (m > 0) ? dir * -1 : dir;
    var m2 = m*m;
    var b2 = p.x*p.x;
    var l2 = link_length * link_length;

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

class RacerFactory {
    num = 1;
    total = 0;

    createRacer(id, icon, color, miObj, gollumd) {
        var mi = miObj['mi'];
        this.total += mi;
        this.num++;
        return new Racer(id, icon, color, miObj, gollumd);
    }

    createNPC(id, icon, mi, eta, statusText) {
        return new RacerNPC(id, icon, "#484848", mi, eta, statusText);
    }

    createStaticRacer(id, icon, mi) {
       console.log(id, icon, mi);
       return new StaticRacer(id, icon, "black", mi);
    }

    createNPCs(frodoData) {
        var frodo = this.createFrodo(frodoData);
        var gollum = this.createGollum();
        var gandalf = this.createGandalf()
        var fellowship = this.createFellowship(gandalf.mi);

        return [frodo, gollum, gandalf, fellowship];
    }

    createFellowship(gandalfMi) {
        var fshipMi = round(this.total / this.num);
        var status = (fshipMi == gandalfMi) ? "At pace" : (fshipMi > gandalfMi) ? "Above pace" : "Behind pace";
        var icon = "fellowship_icon.png";

        return this.createNPC("Fellowship", icon, fshipMi, undefined, status);

    }

    createGandalf() {

        var day = getDayNum();
        var scale = d3.scaleLinear()
            .domain([0, 184 * 1440])
            .range([0, 1778]);
        var min_adj = (day - 1) * 1440 + getMinNum();
        var mi = round(scale(min_adj));
        var icon = "gandalf_icon.png";
        var eta = 184 - day;
        var status = "Rippin' the pipe";

        return this.createNPC("Gandalf", icon, mi, eta, status);
    }

    createFrodo(frodoData) {
        frodoData.push({ day: 0, mi: 0});
        var data = frodoData.sort((a, b) => (a.mi - b.mi));
    
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
    
        var stabbed = (mi >= 241 && mi <= 478);
        var icon = (stabbed) ? "stabbed_frodo2.png" : "frodo_icon2.png";
        var eta = 184 - day;
        var status = (stabbed) ? "Trying not to die" : "Healthy";

        return this.createNPC("Frodo", icon, mi, eta, status);
    }

    createGollum() {
        var grace = 7;
        var day = getDayNum();
        var min = getMinNum();
    
        var day_adj = day - grace;
        if (day_adj < 0) return 0;
    
        var scale = d3.scalePow()
            .domain([0, (365-grace) * 1440 + 1439])
            .range([0, 1778])
            .exponent(1.5);
        
        var mi = round(scale((day - grace - 1) * 1440 + getMinNum()));
        var eta = 366 - day
        return this.createNPC("Gollum", "gollum_icon.png", mi, eta, "Booty huntin'");
    }

}

class RacerBase {
    constructor(id, icon, color, mi, gollumd = false) {
        this.id = id;
        this.mi = mi;
        this.gollumd = gollumd;
        this.static = false;

        this.color = (gollumd) ? "black" : color;
        this.node = {};
        this.node.id = id;
        this.node.patternId = icon + id;
        this.node.radius = 12;
        this.node.img = "./images/icons/" + icon;
        this.node.fill = "url(#" + icon + id + ")";
        this.node.p = getPathPoint(mi);
        this.node.collide = 1.2;
        this.node
        this.anchor = {};
        this.anchor.id = id + "_";
        this.anchor.radius = 1;
        this.anchor.p = getPathPoint(mi);
        this.anchor.collide = 0;
        this.link = {};
        this.link.source = this.id;
        this.link.target = this.anchor.id;
        this.link.length = 4;
    }

    invert(invert) {
        invert = (this.id == 'Luke') ? !invert : invert;
        this.node.p = getForceP(this.mi, 20, invert);
    }

    eta() {
        var day = getDayNum();
        if (this.mi > 0) {
            var est = (1778 / (this.mi / day)) - day;
            if (est < 366) return Math.ceil(est)
        }
    }

    miText() {
        return this.mi + " mi";
    }

    perDayText() {
        return round(this.mi / getDayNum()) + " mi per day";
    }

    togoText() {
        return 1778 - this.mi + " mi to go"
    }

    etaText() {
        var eta = this.eta();
        return (typeof eta !== "undefined") ? "ETA " + eta + ((eta == 1) ? " day" : " days") : "";    
    }

    statusText() {
        return "";
    }
}

class StaticRacer extends RacerBase { 
    constructor(id, icon, color, mi) {
        super(id, icon, color, mi);
        this.static = true;
        this.node.radius = 8;
        this.node.collide = 2;
    }

    invert() {}

    etaText() { return ""; }
}

class Racer extends RacerBase {
    constructor(id, icon, color, miObj, gollumd = false) {
        super(id, icon, color, round(miObj['mi']), gollumd);
        this.miObj = miObj;
    }

    statusText() {
        if (this.miObj['recent1'] == 0) {
            if (this.miObj['recent3'] == 0) {
                if (this.miObj['recent7' == 0]) {
                    return "Completely MIA";
                }
                return "Snoozin'";
            }
            return "Admiring scenery";
        } else if (this.miObj['recent1'] > 9.66) {
            if (this.miObj['recent3'] > 9.66 * 3) {
                if (this.miObj['recent7'] > 9.66 * 7) {
                    return "Wants it";
                }
                return "Cruising";
            }
            return "Speeding up";
        }
        return "Crawling along";
    }
}

class RacerNPC extends RacerBase {
    constructor(id, icon, color, mi, eta, statusText) {
        super(id, icon, color, mi);
        this.etaVal = eta;
        this.statusVal = statusText;
    }

    eta() {
        if (typeof this.etaVal !== "undefined") return this.etaVal;
        
        return super.eta();
    }

    statusText() { return this.statusVal; }
}