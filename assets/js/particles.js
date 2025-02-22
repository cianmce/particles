/******************\
* Cian McElhinney *
*         *
* 2015      *
\******************/
"use strict";

// Constants
var backgroundAlpha = 0.25;
var mouse = {x: 0, y: 0, downX: 0, downY: 0, isDown: false, posHistory:[]};
var maxHistory = 10;
var historyPositions = {start:1, end:5}; // Use history[1] and history[5] to calc distanch -> velocity
var frameRate = 1/40; // Seconds
var frameDelay = frameRate * 1000; // ms
var gravities = [{
          name: "AntiGravity",
          mag: -1
        },{
          name: "None",
          mag: 0
        },{
          name: "Pluto",
          mag: 0.658
        },{
          name: "Moon",
          mag: 1.622
        },{
          name: "Mercury",
          mag: 3.7
        },{
          name: "Mars",
          mag: 3.711
        },{
          name: "Uranus",
          mag: 8.69
        },{
          name: "Venus",
          mag: 8.87
        },{
          name: "Earth",
          mag: 9.81
        },{
          name: "Saturn",
          mag: 10.44
        },{
          name: "Neptune",
          mag: 11.15
        },{
          name: "Jupiter",
          mag: 24.79
        }];
var gravityIndex = 8;
var mediums = [{
          name: "Vacuum",
          mag: 0
        },{
          name: "Air",
          mag: 1.225
        },{
          name: "Water",
          mag: 1000
        },{
          name: "Mercury",
          mag: 13534
        }];
var mediumIndex = 1;
var densities = [{
          name: "Balloon",
          mag: 1.3
        },{
          name: "FootBall",
          mag: 77.13
        },{
          name: "Oak Wood",
          mag: 770
        },{
          name: "Aluminium",
          mag: 2700
        },{
          name: "Steal",
          mag: 7859
        },{
          name: "Lead",
          mag: 11340
        },{
          name: "Osmium",
          mag: 22590
        }];
var densityIndex = 1;

var Cd = 0.47;  // Drag coefficient of Sphere
var wallWidth = 8;

// Global Vars
var canvas, canW, canH, ctx;
var particles = [];
var loopInterval = false;
var lastParticleAddAt = 0;
var particlesPerSecond = 5;
var minLifespan = 15;
var maxLifespan = 45;
var restitutionMag = 0.8;
var roof = false;
var radiusMin=15;
var radiusMax=30;
// Able to grab something.
var grabMode=false;
// Trying to grab something
var grabbing=false;
// Currently Holding a particle
var holding=false;

// FPS
var fpsFilter = 50;
var fps = 1/frameRate, now, lastUpdate = timeNow();

// Objects
function vector(x,y){
  this.x = x;
  this.y = y;
}

function particle(x,y,dx,dy){
  this.pos = new vector(x, y);
  this.vel = new vector(dx, dy);
  this.radius = (Math.random()*(radiusMax-radiusMin)>>0)+radiusMin;

  // Is grabbed by mouse
  this.grabbed = false;

  // Bounce
  this.restitution = -restitutionMag;
  this.stoppedBouncing = false;

  // Color
  this.r = Math.random()*255>>0;
	this.g = Math.random()*255>>0;
	this.b = Math.random()*255>>0;

  // Air Resistance (Drag)
  this.density = densities[densityIndex].mag;
  this.mass = this.density * 4/3 * Math.PI * Math.pow(this.radius, 3); // kg
  this.A = Math.PI * this.radius * this.radius / (10000); // m^2

  // Lifespan
  this.bornAt = timeNow();
  this.lifespan = (Math.random()*(maxLifespan-minLifespan)*1000>>0)+(minLifespan*1000); // random between 0-6secs
  this.dieAt = this.bornAt + this.lifespan;

  this.grabMove = function(){
    this.vel.x = 0;
    this.vel.y = 0;
    this.pos.x = mouse.x;
    this.pos.y = mouse.y;

    // Calc speed incase let go
    // Use the sampleIndex and 2nd Last
    // Using 1st and last lead to funny behaviour if just stopped when you let go
    var totalFrames = mouse.posHistory.length;
    if(totalFrames>2){
      var sampleIndex = 0;
      var deltaX = mouse.posHistory[sampleIndex].x - mouse.posHistory[totalFrames-1].x;
      var deltaY = mouse.posHistory[sampleIndex].y - mouse.posHistory[totalFrames-1].y;
      this.vel.x = deltaX/(totalFrames*2);
      this.vel.y = deltaY/(totalFrames*2);
    }
  }

  this.move = function(){

    if( this.grabbed ){
      return this.grabMove();
    }

    // Adjust frameRate to match Actual frame rate
    // Reduces slowing down when hundreds of particles
    frameRate = 1/fps;

    // Drag Force Equation
    // F = 0.5 C p A V^2
    // x/abs(x) ensures force always opposes motion
    var rho = mediums[mediumIndex].mag;
    var Fx = -0.5 * Cd * this.A * rho * this.vel.x * this.vel.x * this.vel.x / Math.abs(this.vel.x);
    var Fy = -0.5 * Cd * this.A * rho * this.vel.y * this.vel.y * this.vel.y / Math.abs(this.vel.y);

    // Remove divide by zero errors. ie 0/abs(0)
    Fx = (isNaN(Fx) ? 0 : Fx);
    Fy = (isNaN(Fy) ? 0 : Fy);

    // F=MA, A = F/M
    var accx = Fx / this.mass;
    var accy = gravities[gravityIndex].mag + (Fy / this.mass);

    // V = U + AT
    this.vel.x += accx*frameRate;
    this.vel.y += accy*frameRate;

    // Move Particle
    this.pos.x += this.vel.x*frameRate*100;
    this.pos.y += this.vel.y*frameRate*100;

    // Check collisions with other particles
    for(var i=0; i<particles.length; i++){
      var p = particles[i];
      //check if it's 'this'
      if(p !== this){// Different
        var xDist = this.pos.x - p.pos.x;
        var yDist = this.pos.y - p.pos.y;
        var distSquared = xDist*xDist + yDist*yDist;
        if(distSquared <= (this.radius + p.radius)*(this.radius + p.radius)){
          var xVelocity = p.vel.x - this.vel.x;
          var yVelocity = p.vel.y - this.vel.y;
          var dotProduct = xDist*xVelocity + yDist*yVelocity;
          // Checking moving towards one another.
          if(dotProduct > 0){
            var collisionScale = dotProduct / distSquared;

            // Not small collision
            if(collisionScale>0.1) // proportional to magnitude of collision
              playSound(bounceID, collisionScale/1.5);

            var xCollision = xDist * collisionScale;
            var yCollision = yDist * collisionScale;

            var combinedMass = this.mass + p.mass;
            var collisionWeightA = 2 * p.mass / combinedMass;
            var collisionWeightB = 2 * this.mass / combinedMass;

            this.vel.x += collisionWeightA * xCollision;
            this.vel.y += collisionWeightA * yCollision;
            p.vel.x -= collisionWeightB * xCollision;
            p.vel.y -= collisionWeightB * yCollision;

            // Move Particle, advoids getting trapped
            this.pos.x += this.vel.x*2;
            this.pos.y += this.vel.y*2;
            p.pos.x += p.vel.x*2;
            p.pos.y += p.vel.y*2;
          }
        }
      }
    }

    // Check for collisions with walls
    // Bottom
    if (this.pos.y > canH - this.radius - wallWidth) {
      this.vel.y *= this.restitution;
      this.pos.y = canH - this.radius - wallWidth;
    }
    // Top
    if (roof && this.pos.y < this.radius + wallWidth){
      this.vel.y *= this.restitution;
      this.pos.y = this.radius + wallWidth;
    }
    // Right
    if (this.pos.x > canW - this.radius - wallWidth) {
      this.vel.x *= this.restitution;
      this.pos.x = canW - this.radius - wallWidth;
    }
    // Left
    if (this.pos.x < this.radius + wallWidth) {
      this.vel.x *= this.restitution;
      this.pos.x = this.radius + wallWidth;
    }
  }

  this.isDead = function(){
    return this.dieAt <= timeNow();
  }

  this.draw = function(){
		ctx.beginPath();
    ctx.fillStyle = this.grad();
		ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2, false);
		ctx.fill();
  }

  this.lifeFraction = function(){
    var now = timeNow();
    var elapsed = now - this.bornAt;
    var ret = 1 - (elapsed/this.lifespan);
    return roundTo(ret, 3);
  }

  this.grad = function(){
    var grad = ctx.createRadialGradient(this.pos.x, this.pos.y, 0, this.pos.x, this.pos.y, this.radius);
    var color = "rgba("+this.r+", "+this.g+", "+this.b+", "+this.lifeFraction()*0.8+")";
		grad.addColorStop(0, "rgba(255,255,255,"+this.lifeFraction()+")");
		grad.addColorStop(0.4, "rgba(255,255,255,"+this.lifeFraction()+")");
		grad.addColorStop(0.6, color);
		grad.addColorStop(0.65, color);
		grad.addColorStop(1, "rgba(0,0,0,0.1)");// Transparent
    return grad;
  }
}



// Functions
// Util
function roundTo(val, prec){
  return ((val * Math.pow(10, prec))>>0) / Math.pow(10, prec);
}
function timeNow(){
  return new Date().getTime();
}


// User Input
function getMousePosition(e) {
  mouse.x = e.pageX - canvas.offsetLeft;
  mouse.y = e.pageY - canvas.offsetTop;
}

function getTouchPosition(e) {
  mouse.x = e.touches[0].pageX - canvas.offsetLeft;
  mouse.y = e.touches[0].pageY - canvas.offsetTop;
}

function touchStart(e) {
  console.log("touchStart e:")
  console.log(e)
  e.preventDefault();
  getTouchPosition(e);
  mouse.isDown = true;
  mouse.downX = e.touches[0].pageX - canvas.offsetLeft;
  mouse.downY = e.touches[0].pageY - canvas.offsetTop;
  if( grabMode ){
    setCursor('closed');
    grabbing=true;
  }else{
    grabbing=false;
    unGrabAll();
  }
}

function touchEnd(e) {
  mouse.isDown = false;
  unGrabAll();
  grabbing=false;
  if( grabMode ){
    setCursor('open');
  }else{
    setCursor('default');
  }
}

function mouseDown(e) {
  console.log("mouseDown e:")
  console.log(e)
  if (e.which == 1) { //Left click
    getMousePosition(e);
    mouse.isDown = true;
    mouse.downX = e.pageX - canvas.offsetLeft;
    mouse.downY = e.pageY - canvas.offsetTop;

    if( grabMode ){
      setCursor('closed');
      grabbing=true;
    }else{
      grabbing=false;
      unGrabAll();
    }
  }
}

function mouseUp(e) {
  if (e.which == 1) { //Left click
    mouse.isDown = false;
    unGrabAll();
    grabbing=false;
    if( grabMode ){
      setCursor('open');
    }else{
      setCursor('default');
    }
  }
}

function setCursor(cursor){
  // Params:
  //  open
  //  closed
  //  default
  $("html").removeClass();
  if(cursor=='open'){
    // In grabMode
    $("html").addClass("open_hand");
  }else if(cursor=='closed'){
    // Holding something
    $("html").addClass("closed_hand");
  }
}

function keypress(e){
  e = e || window.event;

  if (e.keyCode == 77 || e.keyCode==32) {
    // M/Space, Toggle Menu
    toggleMenu();
  }else if(e.keyCode==80){
    // P. Pause
    togglePause();
  }else if(e.keyCode==17 || e.keyCode==91){ // CTRL or CMD
    // Ctrl. Grab
    e.preventDefault();
    grabMode = !grabMode;
    if(grabMode==false){
      setCursor('default');
      unGrabAll();
      grabbing=false;
      holding=false;
    }else{
      setCursor('open');
    }
    return;
  }
}
function keyup(e){
  e = e || window.event;
}
// User Input End

function init(){
  // Get canvas Element
  canvas = document.getElementById("canvas");

  // Set up listeners
  window.onresize     = resize;
  window.onmousemove  = getMousePosition;
  canvas.onmousedown  = mouseDown;
  canvas.ontouchstart = touchStart;
  canvas.ontouchmove  = getTouchPosition;
  canvas.ontouchend   = touchEnd;
  window.onmouseup    = mouseUp;
  window.onkeydown    = keypress;
  window.onkeyup      = keyup;

  // get context
  ctx = canvas.getContext("2d");

  // Full screen
  canW = window.innerWidth;
  canH = window.innerHeight;
  canvas.width = canW;
  canvas.height = canH;
  loopInterval = setInterval(playLoop, frameDelay);
}

function togglePause(){
  if(loopInterval){
    clearInterval(loopInterval);
    loopInterval = false;
  }else{
    loopInterval = setInterval(playLoop, frameDelay);
  }
}

function drawFPS(){
  var thisFrameFPS = 1000 / ((now=timeNow()) - lastUpdate);
  if (now!=lastUpdate){
    fps += (thisFrameFPS - fps) / fpsFilter;
    lastUpdate = now;
  }
  ctx.fillStyle = "rgba(255,255,0,1)";
  ctx.font = "bold 17px Arial";
  ctx.fillText("fps: "+fps.toFixed(2), canW-120, 40);
}

function resize(e){
  canW = window.innerWidth;
  canH = window.innerHeight;
  canvas.width = canW;
  canvas.height = canH;
  clearCanvas();

}

function getGrad(){
  // Background
  var grad = ctx.createLinearGradient(0, 0, canW, canH);
  grad.addColorStop(0,   'rgba(255,0,0,'+backgroundAlpha+')');
  grad.addColorStop(1 / 6, 'rgba(255,127,0,'+backgroundAlpha+')');
  grad.addColorStop(2 / 6, 'rgba(255,255,0,'+backgroundAlpha+')');
  grad.addColorStop(3 / 6, 'rgba(0,255,0,'+backgroundAlpha+')');
  grad.addColorStop(4 / 6, 'rgba(0,255,255,'+backgroundAlpha+')');
  grad.addColorStop(5 / 6, 'rgba(0,0,255,'+backgroundAlpha+')');
  grad.addColorStop(1,   'rgba(255,0,255,'+backgroundAlpha+')');
  return grad;
}

function clearCanvas() {
  // start with a grey base
	ctx.fillStyle = "rgba(150,150,150,1)";
	ctx.fillRect(0,0,canW,canH);

  // add rainbow effect
	ctx.fillStyle = getGrad();
	ctx.fillRect(0,0,canW,canH);

  // Draw Walls
  var grad;
  var color1 = "rgba(20,20,0,1)";
  var color2 = "rgba(110,70,0,0.7)";
  // Left
  grad = ctx.createLinearGradient(0, 0, 0, canH);
  grad.addColorStop("0", color1);
  grad.addColorStop("0.25", color2);
  grad.addColorStop("0.5", color1);
  grad.addColorStop("0.75", color2);
  grad.addColorStop("1.0", color1);
  ctx.beginPath();
  ctx.lineWidth=wallWidth;
  ctx.strokeStyle=grad;
  ctx.moveTo(ctx.lineWidth/2, 0);
  ctx.lineTo(ctx.lineWidth/2, canH);
  ctx.stroke();
  // Right
  ctx.beginPath();
  ctx.lineWidth=wallWidth;
  ctx.strokeStyle=grad;
  ctx.moveTo(canW-ctx.lineWidth/2, 0);
  ctx.lineTo(canW-ctx.lineWidth/2, canH);
  ctx.stroke();
  // Bottom
  grad = ctx.createLinearGradient(0, 0, canW, 0);
  grad.addColorStop("0", color1);
  grad.addColorStop("0.25", color2);
  grad.addColorStop("0.5", color1);
  grad.addColorStop("0.75", color2);
  grad.addColorStop("1.0", color1);
  ctx.beginPath();
  ctx.lineWidth=wallWidth;
  ctx.strokeStyle=grad;
  ctx.moveTo(0, canH-ctx.lineWidth/2);
  ctx.lineTo(canW-ctx.lineWidth/2, canH-ctx.lineWidth/2);
  ctx.stroke();
  if(roof){
    // Top
    ctx.beginPath();
    ctx.lineWidth=wallWidth;
    ctx.strokeStyle=grad;
    ctx.moveTo(0, ctx.lineWidth/2);
    ctx.lineTo(canW-ctx.lineWidth/2, ctx.lineWidth/2);
    ctx.stroke();
  }
}

function removeDeadParticles(){
  for(var i=0; i<particles.length; i++){
    if(particles[i].isDead()){
      // Remove at dead Index
      particles.splice(i, 1);
      playSound(popID, 0.8);
    }
  }
}

function moveParticles(){
  for(var i=0; i<particles.length; i++){
    particles[i].move();
  }
}

function drawParticles(){
  for(var i=0; i<particles.length; i++){
    particles[i].draw();
  }
}

function addParticles(){
  // Only add if mouseDown and not grab mode
  if(mouse.isDown && !grabbing){
    // Check if it's time to add particle
    var now = timeNow();
    if( (now - lastParticleAddAt) > (1000/particlesPerSecond) ){
      var dx = (mouse.downX - mouse.x)/10;
      var dy = (mouse.downY - mouse.y)/10;
      var p = new particle(mouse.downX, mouse.downY, dx, dy);
      particles.push(p);
      lastParticleAddAt = now;
    }
  }
}
function grabParticle(){
  // Only grab if mouseDown and grab mode
  if(mouse.isDown && grabbing && !holding){
    // Add grab history
    var historyLen = mouse.posHistory.unshift({x:mouse.x, y:mouse.y});
    if(historyLen>maxHistory){
      mouse.posHistory.pop();
    }

    var gIndex = null;
    for(var i=0; i<particles.length; i++){
      // Check if grabbing p (current particle)
      var p = particles[i];
      if(p.grabbed){
        return;
      }
      var xDist = mouse.x - p.pos.x;
      var yDist = mouse.y - p.pos.y;
      var distSquared = xDist*xDist + yDist*yDist;
      // Check if within the radius
      // Quicker to check if distance^2 is less than the particles radius^2
      if(distSquared <= (p.radius*p.radius)){
        gIndex = i;
      }
    }
    if(gIndex!==null){
      particles[gIndex].grabbed = true;
      return;
    }
  }
  // Not holding anything
  // Clear history
  mouse.posHistory = [];
}
function unGrabAll(){
  for(var i=0; i<particles.length; i++){
    particles[i].grabbed = false;
  }
}

function updateText(){
  $( "#pCount span" ).text(particles.length);
}

function drawLaunchCenter(){
  // Only draw it if mouse is down and not grab mode
  if(!mouse.isDown || grabbing)
    return;
  var radius = 35;
  var grad = ctx.createRadialGradient(mouse.downX, mouse.downY, radius/10, mouse.downX, mouse.downY, radius);
  var color = "rgba(255,255,255,1)";
  var color2 = "rgba(0,0,0,0)";

  grad.addColorStop(0, color2);
  grad.addColorStop(0.4, color);
  grad.addColorStop(0.6, color);
  grad.addColorStop(1, color2);

  ctx.beginPath();
  ctx.fillStyle = grad;
  ctx.arc(mouse.downX, mouse.downY, radius, 0, Math.PI * 2, false);
  ctx.fill();

  // Draw line
  grad=ctx.createLinearGradient(mouse.downX, mouse.downY,mouse.x, mouse.y);
  grad.addColorStop("0","rgba(255,70,0,1)");
  grad.addColorStop("0.4", "rgba(255,128,0,0.8)");
  grad.addColorStop("0.6", "rgba(100,50,0,0.4)");
  grad.addColorStop("1.0","rgba(0,0,0,0.3)");
  ctx.beginPath();
  ctx.lineWidth=7;
  ctx.strokeStyle=grad;
  ctx.moveTo(mouse.downX, mouse.downY);
  ctx.lineTo(mouse.x, mouse.y);
  ctx.lineCap = "round";
  ctx.stroke();

  // Write Strength
  var dx = (mouse.downX - mouse.x)/10;
  var dy = (mouse.downY - mouse.y)/10;
  var mag = roundTo(Math.sqrt((dx*dx)+(dy*dy)), 1);
  var fontSize = Math.min((mag>>0)+10, 35);
  var g = 255 - Math.min((mag*2>>0)+10, 255);
  ctx.fillStyle = "rgba(255,"+g+",0,1)";
  ctx.font = "bold "+fontSize+"px Arial";
  ctx.fillText(mag+" m/s", mouse.x, mouse.y);
}


function playLoop(){
  clearCanvas();
  removeDeadParticles();
  addParticles();
  grabParticle();
  moveParticles();
  drawParticles();
  updateText();
  drawLaunchCenter();
  drawFPS();
}

// Sound
var popID = "pop";
var bounceID = "bounce";
var mute = false;
function loadSounds(){
  createjs.Sound.registerSound("assets/audio/pop.mp3", popID);
  createjs.Sound.registerSound("assets/audio/bounce.mp3", bounceID);
}
function playSound(ID, vol) {
  if(!mute){
    var instance = createjs.Sound.play(ID);
    instance.volume = Math.min(vol, 1.0);
  }
}
function toggleSound(){
  mute = !mute;
  $( "#sound span" ).toggleClass("ui-icon-volume-on ui-icon-volume-off");
}

// UI Functions
function toggleMenu(){
  if( $("#sliders").is(":visible") ){ // Hide
    $("#menuButton .ui-button-text").text("Show Menu");
    $("#menuButton .ui-button-icon-secondary").toggleClass("ui-icon-triangle-1-n ui-icon-triangle-1-s");
    $("#sliders").slideUp(300);
  }else{ //Show
    $("#menuButton .ui-button-text").text("Hide Menu");
    $("#menuButton .ui-button-icon-secondary").toggleClass("ui-icon-triangle-1-s ui-icon-triangle-1-n");
    $("#sliders").slideDown(300);
  }
}

function slideChange(e, ui){
  var id = e.target.id;
  var vals = ui.values;
  var val = ui.value;
  if(vals){ // Range slider
    $( "#"+id+"Info > span" ).text( vals[0]+"-"+vals[1]);
    if(id=="radius"){
      radiusMin = vals[0];
      radiusMax = vals[1];
    }else{
      maxLifespan = vals[0];
      minLifespan = vals[1];
    }
  }else{ // Single Slider
    if(id=="gravity"){
      gravityIndex = val;
      $( "#"+id+"Info > span" ).text( "("+gravities[gravityIndex].name+") "+ gravities[gravityIndex].mag);
      return;
    }
    if(id=="mediumdensity"){
      mediumIndex = val;
      $( "#"+id+"Info > span" ).text( "("+mediums[mediumIndex].name+") "+ mediums[mediumIndex].mag);
      return;
    }
    if(id=="density"){
      densityIndex = val;
      $( "#"+id+"Info > span" ).text( "("+densities[densityIndex].name+") "+ densities[densityIndex].mag);
      return;
    }
    $( "#"+id+"Info > span" ).text( val );
    if(id=="elestic")
      restitutionMag = val;
    else if(id=="pps")
      particlesPerSecond = val;
  }

}

function initSliders(){
  $( "#radius, #life, #pps, #elestic, #gravity, #mediumdensity, #density" ).slider({
    orientation: "horizontal",
    animate: "slow",
    slide: slideChange,
    change: slideChange
  });
  // Ranges
  $( "#radius, #life" ).slider({
    range: true,
  });
  $( "#radius" ).slider({
    min: 1,
    max: 50,
    values: [radiusMin,radiusMax],
  });
  $( "#life" ).slider({
    min: 1,
    max: 240,
    values: [minLifespan,maxLifespan]
  });
  // Single
  $( "#pps, #elestic, #gravity, #mediumdensity, #density" ).slider({
    range: "min"
  });
  $( "#pps" ).slider({
    min: 0,
    max: 40,
    step: 0.5,
    value: particlesPerSecond
  });
  $( "#gravity" ).slider({
    min: 0,
    max: gravities.length-1,
    step: 1,
    value: gravityIndex
  });
  $( "#mediumdensity" ).slider({
    min: 0,
    max: mediums.length-1,
    step: 1,
    value: mediumIndex
  });
  $( "#density" ).slider({
    min: 0,
    max: densities.length-1,
    step: 1,
    value: densityIndex
  });
  $( "#elestic" ).slider({
    min: 0,
    max: 1,
    step: 0.01,
    value: restitutionMag
  });
}

function setGrabButton(){
  // if touch events in use enable grab option and unhide grabDiv
  if('ontouchstart' in window || navigator.msMaxTouchPoints){
    $("#grabContainer").show();
    $("#controls").hide();
  }
}

$(document).ready(function() {
  // Sliders
  initSliders()

  // Show grab button if needed
  setGrabButton();

  // Init Buttons and click handlers
  $( "#roof" ).button();
  $( "#grab" ).button();
  $( "#sound" ).button();
  $( "#sound" ).click(toggleSound);
  $("#menuButton").click(toggleMenu);
  // Toggle Roof
  $( "#roof" ).click(function(){
    if($( "#roof" ).is(":checked")){
      roof=true;
      $( "#roofText > span" ).text("Roof On");
    }else{
      roof=false;
      $( "#roofText > span" ).text("Roof Off");
    }
  });
  // Toggle Grab
  $( "#grab" ).click(function(){
    if($( "#grab" ).is(":checked")){
      grabMode=true;
      $( "#grabText > span" ).text("Grab On");
    }else{
      grabMode=false;
      $( "#grabText > span" ).text("Grab Off");
    }
  });
  // Sound
  loadSounds();
});

// Main
init();
