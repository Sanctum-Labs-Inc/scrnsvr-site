// Hearth — p5.js instance mode
var hearthSketch = new p5(function(p) {
  var particles = [];
  var symmetry = 6;
  var t = 0;
  var zoom;
  var touchInfluence = 0;

  p.setup = function() {
    var cnv = p.createCanvas(p.windowWidth, p.windowHeight);
    cnv.parent('page-two');
    p.colorMode(p.HSB, 360, 100, 100, 1);
    p.noStroke();
    p.pixelDensity(2);
    p.frameRate(60);
    zoom = p.min(p.width, p.height) * 0.2;
    for (var i = 0; i < 3500; i++) {
      particles.push(new FlameParticle(p));
    }
    p.background(0);
  };

  p.draw = function() {
    p.background(0, 0.1);
    p.translate(p.width / 2, p.height / 2);
    t += 0.025;
    for (var i = 0; i < particles.length; i++) {
      particles[i].update(p, t, touchInfluence);
      particles[i].display(p, t, touchInfluence, zoom, symmetry);
    }
  };

  p.touchMoved = function() {
    var dx = p.abs(p.mouseX - p.pmouseX);
    var dy = p.abs(p.mouseY - p.pmouseY);
    touchInfluence = (dx + dy) / 150.0;
    return false;
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    zoom = p.min(p.width, p.height) * 0.2;
  };
});

function FlameParticle(p) {
  this.x = p.random(-1, 1);
  this.y = p.random(-1, 1);
  this.life = p.random(0, 100);
  this.speed = 0;
  this.hueSeed = p.random(360);
}

FlameParticle.prototype.reset = function(p) {
  this.x = p.random(-1, 1);
  this.y = p.random(-1, 1);
  this.life = p.random(0, 100);
  this.speed = 0;
  this.hueSeed = p.random(360);
};

FlameParticle.prototype.update = function(p, t, touchInfluence) {
  var a = 1.4 + 0.4 * p.sin(t * 0.9 + touchInfluence * 2);
  var b = 1.3 + 0.3 * p.cos(t * 0.5);
  var c = 0.9 + 0.4 * p.sin(t * 0.3);
  var d = 1.2 + 0.2 * p.cos(t * 0.7 + touchInfluence);

  var nx = p.sin(a * this.y) - p.cos(b * this.x);
  var ny = p.sin(c * this.x) - p.cos(d * this.y);
  nx += 0.5 * p.sin(this.y * 3 + t) * touchInfluence;
  ny += 0.5 * p.cos(this.x * 3 - t) * touchInfluence;

  this.speed = p.sqrt((this.x - nx) * (this.x - nx) + (this.y - ny) * (this.y - ny));
  this.x = nx;
  this.y = ny;
  this.life++;
  if (this.life > 300 || this.speed > 6.0) this.reset(p);
};

FlameParticle.prototype.display = function(p, t, touchInfluence, zoom, symmetry) {
  var px = this.x * zoom;
  var py = this.y * zoom;

  var alpha = p.map(this.speed, 0, 0.5, 0.01, 0.08);
  var baseHue = (this.hueSeed + t * 100 + touchInfluence * 200) % 360;
  var size = 1;

  for (var i = 0; i < symmetry; i++) {
    var phaseDrift = 0.15 * touchInfluence * p.sin(t + i);
    var angle = p.TWO_PI / symmetry * i + phaseDrift;
    var cosA = p.cos(angle);
    var sinA = p.sin(angle);
    var x1 = px * cosA - py * sinA;
    var y1 = px * sinA + py * cosA;

    var distFromCenter = p.sqrt(x1 * x1 + y1 * y1);
    var angleFromCenter = p.atan2(y1, x1);

    var hueMod =
      40 * p.sin(angleFromCenter * 3 + t * 0.8) +
      30 * p.cos(distFromCenter * 0.02 + t * 0.6) +
      20 * p.sin(this.hueSeed * 0.05 + t * 0.4) +
      15 * p.sin(i * 0.5 + t * 0.3);

    var centerHeat = p.map(distFromCenter, 0, p.width * 0.4, -30, 0);
    var flameHue = (baseHue + hueMod + centerHeat + 360) % 360;

    p.fill(flameHue, 90, 100, alpha);
    p.ellipse(x1, y1, size, size);

    p.fill((flameHue + 180) % 360, 80, 100, alpha * 0.7);
    p.ellipse(-x1, y1, size * 0.9, size * 0.9);
  }
};
